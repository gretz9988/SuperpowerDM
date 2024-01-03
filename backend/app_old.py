from flask import Flask, request, jsonify, url_for, redirect, session, send_from_directory
from flask_oauthlib.client import OAuth
from flask_cors import CORS
from dotenv import load_dotenv
from InstaAPI.instagram_api import InstagramAPI
from InstaAPI.defines import getCreds
from xAPI.x_api import xAPI
import requests
import secrets
import boto3
import json
import os

if not os.environ.get('FLASK_SECRET_KEY'):
    secret_key = secrets.token_hex(16)
    with open('.env', 'a') as f:
        f.write(f'\nFLASK_SECRET_KEY={secret_key}\n')
    os.environ['FLASK_SECRET_KEY'] = secret_key  # Set the environment variable

app = Flask(__name__, static_folder='build')
app.secret_key = os.environ['FLASK_SECRET_KEY']
aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
CORS(app)
load_dotenv()
oauth = OAuth(app)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Check if the user is logged in
    if 'accessToken' in session:
        print('accessToken in session')
        if 'setupComplete' not in session or not session['setupComplete']:
            print('setup not complete')
            userID = session.get('userID')
            return send_from_directory(app.static_folder, path)
        else:
            
            return send_from_directory(app.static_folder, 'index.html')  # Serve the Home screen
    else:
        # User is not logged in, redirect to login
        print('User is not logged in')
        return send_from_directory(app.static_folder, path)

@app.route('/login')
def login():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/process_fb_response', methods=['POST'])
def process_fb_response():
    data = request.get_json()
    fbResponse = data.get('fbResponse')
    token = data.get('accessToken')
    print(fbResponse)
    print(token)

    if fbResponse and token:
        print('Token and User ID received')
        userID = fbResponse.get('id')
        session['userID'] = userID
        session['accessToken'] = token  # Store the token in the session

        s3 = boto3.client(
            's3',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key
        )

        bucket_name = 'superpowerdm'
        prefix = f'{userID}/'
        response = s3.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
        file_exists = 'Contents' in response and response['Contents']

        if file_exists:
            print('imprint exists')
            return redirect(url_for('home', userID=userID))
        else:
            print('imprint does not exist')
            creds = getCreds(token)
            # for profile
            pageid = InstagramAPI(creds).getId()  # setup imprint
            username, content, latest_timestamp = InstagramAPI(creds).getContent(since_timestamp=None)
            imprint = InstagramAPI(creds).extractInstaImprint(username, content)

            # Convert imprint data to JSON string
            imprint_json = json.dumps(imprint)
            profile_json = json.dumps(pageid)

            # Define the file name and path
            file_name = f"{userID}/{username}_insta_imprint.json"
            profile_name = f"{userID}/{username}_profile.json"

            # Upload the file to S3
            s3.put_object(Bucket=bucket_name, Key=file_name, Body=imprint_json)
            s3.put_object(Bucket=bucket_name, Key=profile_name, Body=profile_json)
            print('imprint uploaded to S3') 
            return redirect(url_for('setup', userID=userID))
    else:
        return jsonify({'status': 'Invalid data received'})  
    
twitter = oauth.remote_app(
    'twitter',
    consumer_key=os.getenv('TWITTER_CONSUMER_KEY'),
    consumer_secret=os.getenv('TWITTER_CONSUMER_SECRET'),
    request_token_url='https://api.twitter.com/oauth/request_token',
    access_token_url='https://api.twitter.com/oauth/access_token',
    authorize_url='https://api.twitter.com/oauth/authorize',
)


@app.route('/setup/<userID>', methods=['GET', 'POST'])
def setup(userID):
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            bio = data.get('bio')
            setup_complete = data.get('setupComplete', False)

            s3 = boto3.client(
                    's3',
                    aws_access_key_id=aws_access_key_id,
                    aws_secret_access_key=aws_secret_access_key
                )
            bio_json = json.dumps({'bio': bio})
            print('bio uploaded to S3')
            file_name = f"{session['userID']}/custom_imprint.json"
            s3.put_object(Bucket='superpowerdm', Key=file_name, Body=bio_json)
            if setup_complete:
                print('setup complete')
                session['setupComplete'] = True
                return redirect(url_for('home', userID=userID))
            return jsonify({'status': 'Success'}), 200
        else:
            return jsonify({'error': 'Invalid Content-Type'}), 400
    elif request.method == 'GET':

        return send_from_directory(app.static_folder, 'index.html')


@app.route('/login/twitter')
def login_twitter():
    return twitter.authorize(callback=url_for('twitter_authorized', _external=True))

# Route to handle the callback from Twitter
@app.route('/login/twitter/authorized')
def twitter_authorized():
    resp = twitter.authorized_response()
    if 'userID' not in session:
        print("UserID not found in session.")
    if resp is None or resp.get('oauth_token') is None:
        return 'Access denied: reason={} error={}'.format(
            request.args['error_reason'],
            request.args['error_description']
        )
    session['twitter_token'] = (resp['oauth_token'], resp['oauth_token_secret'])
    x_api = xAPI()
    twitter_data = x_api.get_user_data(resp['user_id'], resp['screen_name'])

    # Check if Twitter data is fetched successfully
    if twitter_data:
        s3 = boto3.client(
            's3',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key
        )
        bucket_name = 'superpowerdm'
        twitter_data_json = json.dumps(twitter_data)
        file_name = f"{session['userID']}/{resp['screen_name']}_x_data.json"  # The file name for Twitter data

        # Upload the file to S3
        s3.put_object(Bucket=bucket_name, Key=file_name, Body=twitter_data_json)
        print('Twitter data uploaded to S3')
    return redirect(f"https://localhost:5000/setup/{session['userID']}?twitter_login_success=true")  # Replace with the appropriate route

@app.route('/<userID>')
def home(userID):
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True, ssl_context=('localhost.crt', 'localhost.key'))