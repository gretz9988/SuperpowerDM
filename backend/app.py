# Standard library imports
import json
import os

# Related third party imports
from dotenv import load_dotenv
from flask import Flask, send_from_directory, request, Response, redirect, url_for, session, jsonify
from flask_cors import CORS
from flask_oauthlib.client import OAuth
import boto3
from botocore.exceptions import ClientError
import requests
import aiohttp
import asyncio

# Local application/library specific imports
from InstaAPI.instagram_api import InstagramAPI
from InstaAPI.defines import getCreds
from xAPI.x_api import xAPI

app = Flask(__name__, static_folder='build')
load_dotenv()
CORS(app)
oauth = OAuth(app)
app.secret_key = os.environ.get("FLASK_SECRET_KEY")
if not app.secret_key:
    raise RuntimeError("FLASK_SECRET_KEY is not set in the environment")

# AWS S3
aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)

# Twitter
twitter = oauth.remote_app(
    'twitter',
    consumer_key=os.getenv('TWITTER_CONSUMER_KEY'),
    consumer_secret=os.getenv('TWITTER_CONSUMER_SECRET'),
    request_token_url='https://api.twitter.com/oauth/request_token',
    access_token_url='https://api.twitter.com/oauth/access_token',
    authorize_url='https://api.twitter.com/oauth/authorize',
) 

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and path != "login" and path != "setup" and path != "home":
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/login', methods=['POST'])
def facebook_login():
    access_token = request.json.get('accessToken')
    fb_info = request.json.get('fbResponse')
    name = fb_info.get('name')
    session['access_token'] = access_token 
    session['fb_info'] = fb_info
    session['name'] = name
    print(session['fb_info'])

    bucket_name = 'superpowerdm'
    prefix = f'{name}/setup_complete.txt'
    response = s3.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
    setup_complete = any(obj['Key'] == prefix for obj in response.get('Contents', []))
    print(setup_complete)

    if setup_complete:
        print('setup already completed')
        return {'success': True, 'redirect': '/home'}

    if session['access_token'] and session['fb_info']: # AUTHENTICATION FOR ACCESS TOKEN AND FB INFO REQUIRED
        print('Token and User ID received')
        prefix = f'{name}/'
        response = s3.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
        file_exists = 'Contents' in response and response['Contents']
        if file_exists:
            print('imprint exists')
            return {'success': True, 'redirect': '/setup'}

        else:
            # fb imprint
            creds = getCreds(session['access_token'])
            user_id = InstagramAPI(creds).getId()
            username, content, latest_timestamp = InstagramAPI(creds).getContent(since_timestamp=None)
            session['username'] = username
            session['instagram_user_id'] = user_id 

            imprint = InstagramAPI(creds).extractInstaImprint(username, content)
            imprint_json = json.dumps(imprint)

            file_name = f"{name}/{username}_insta_imprint.json"
            s3.put_object(Bucket=bucket_name, Key=file_name, Body=imprint_json)
            print('Imprint saved to S3')
            return {'success': True, 'redirect': '/setup'}

    return {'success': False, 'message': 'Login failed'}

# onboarding
@app.route('/setup', methods=['POST'])
def setup():
    name = session.get('name')
    if request.method == 'POST':
        if request.is_json:
            # Save bio to s3
            data = request.get_json()
            bio = data.get('bio')
            bio_json = json.dumps({'bio': bio})

            file_name = f"{name}/custom_imprint.json"
            
            s3.put_object(Bucket='superpowerdm', Key=file_name, Body=bio_json)
            print('bio uploaded to S3')

    setup_complete_file_name = f"{name}/setup_complete.txt"
    s3.put_object(Bucket='superpowerdm', Key=setup_complete_file_name, Body="Setup complete")
    print('setup complete!')
    return send_from_directory(app.static_folder, 'index.html')

# Route to start the OAuth flow with Twitter
@app.route('/login/twitter')
def login_twitter():
    return twitter.authorize(callback=url_for('twitter_authorized', _external=True))

# Route to handle the callback from Twitter
@app.route('/login/twitter/authorized')
def twitter_authorized():
    name = session.get('name')
    resp = twitter.authorized_response()
    if resp is None or resp.get('oauth_token') is None:
        return 'Access denied: reason={} error={}'.format(
            request.args['error_reason'],
            request.args['error_description']
        )
    x_tokens = (resp['oauth_token'], resp['oauth_token_secret'])
    x_api = xAPI()
    twitter_data = x_api.get_user_data(resp['user_id'], resp['screen_name'])

    if twitter_data:
        bucket_name = 'superpowerdm'
        twitter_data_json = json.dumps(twitter_data)
        file_name = f"{name}/{resp['screen_name']}_x_data.json"

        # Upload twitter data to S3
        s3.put_object(Bucket=bucket_name, Key=file_name, Body=twitter_data_json)
        print('Twitter data uploaded to S3')
    return redirect(f"https://localhost:5000/setup?twitter_login_success=true")

# Card Component fetch instagram media
@app.route('/fetch_media', methods=['POST'])
def fetch_media():
    access_token = session.get('access_token')
    if not access_token:
        return {'error': 'User not logged in'}, 401

    creds = getCreds(session['access_token'])
    InstagramAPI(creds).getId()
    instagram_api = InstagramAPI(creds) 
    username, content, latest_timestamp = instagram_api.getContent(since_timestamp=None) #API Call
    session['content'] = content
    session['username'] = username

    print('Media fetched')
    return jsonify(session['content'])

# Card Component fetch instagram media comments
@app.route('/fetch_comments', methods=['POST'])
def fetch_comments():
    access_token = session.get('access_token')
    username = session.get('username')
    if not access_token:
        return {'error': 'User not logged in'}, 401

    data = request.get_json()
    media_id = data.get('media_id')
    username = data.get('username')
    if not media_id:
        return {'error': 'Media ID is required'}, 400

    creds = getCreds(access_token)
    instagram_api = InstagramAPI(creds)
    InstagramAPI(creds).getId()
    comments = instagram_api.getCommentsForMedia(media_id)
    clean_comments = []
    for comment in comments:
        if comment['username'] != session['username'] and session['username'] not in comment.get('replies', []):
            clean_comments.append(comment)

    print('comments fetched')
    return jsonify(clean_comments)

#Card Component submit comments to GPT
@app.route('/submit_comments', methods=['POST'])
def submit_comments():
    data = request.get_json()
    name = session.get('name')
    username = session.get('username')
    comment_list = []
    # Keep ID and comment text
    for comment in data:
        comment.pop('likes', None)
        comment.pop('replies', None)
        comment.pop('username', None)
        comment_obj = {
        'id': comment['id'],
        'comment': comment['comment']
        }
        
        comment_list.append(comment_obj)

    bucket_name = 'superpowerdm'
    print(name, username)
    file_name = f"{name}/{username}_insta_imprint.json"

    try:
        file_object = s3.get_object(Bucket=bucket_name, Key=file_name)
        imprint_data = json.loads(file_object['Body'].read().decode('utf-8'))
    except Exception as e:
        print(f"Error retrieving imprint data from S3: {e}")
        return jsonify({"message": "Error retrieving imprint data"}), 500

    # OPENAI API CALL (THIS IS TEMPORARY AND WILL BE COMPARTMENTALIZED)
    URL = "https://api.openai.com/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
        "Content-Type": "application/json",
        "User-Agent": "PythonOpenAIAPI/1.0"
    }

    # GPT RESPONSE IS A JSON STRING SO WE NEED TO CONVERT IT TO JSON
    def make_prompt(imprint_data, inputs):
        prompt = [
            {"role": "system", "content": f"You are {username}. You will be provided with a knowledge base of {username} in parts. You will respond to any input in the exact same style and tone as {username} based on the knowledge base. Remember: You are responding to comments so keep them short and sweet. You might be given a post you made for context."},
            {"role": "system", "content": "YOU CAN EVEN RESPOND WITH 1 WORD. CONCISE RESPONSES ARE BETTER. BE VULGAR IF IT FITS THE CHARACTER. REMEMBER, YOU MUST EMBODY THE PERSON. IF THEY DON'T WRITE ENTHUSIASTICALLY, THEN DON'T, IF THEY'RE WITTY THEN DO THE SAME. BE THEM THROUGH THEIR WRITING."},
            {"role": "system", "content": "You will be prompted with a list of comments. You will be prompted with a list of objects  like this: [{'id': '18005478959234487', 'comment': 'Nice!'}...] You will respond to each comment in each object in the exact same style and tone as the user based on the knowledge base. Remember: You are responding to comments so keep them short and sweet. You might be given a post you made for context."},
            {"role": "system", "content": "FOR EXAMPLE, the input is: [{'id': '18005478959234487', 'comment': 'Nice!'}] you will return [{'id': '18005478959234487', 'comment': 'Nice!', 'response': 'YOUR RESPONSE'}]"},
            {"role": "system", "content": f"please make sure to look at and respond to every object in the list. YOUR RESPONSES MUST BE IN THE SAME ORDER AS THE INPUTS. YOUR RESPONSES MUST BE ORIGINAL AND NOT FROM PREVIOUS DATA. YOU NEED TO RESPOND IN THE VOICE OF {username}. DO NOT INCLUDE @USERNAMES IN YOUR RESPONSES"},
            {"role": "system", "content": "You MUST output a javascript list with double quotes"},
        ]
        prompt.extend(imprint_data)
        prompt.extend(inputs)
        return prompt

    async def openai_api_call(data, retries=3):
        async with aiohttp.ClientSession() as session:
            for _ in range(retries):
                try:
                    async with session.post(URL, headers=headers, json=data) as response:
                        response_json = await response.json()
                        print(response_json)
                        # GPT responds in JSON (as a string) so we convert it to actual JSON
                        if 'choices' in response_json: 
                            latest_response = response_json['choices'][0]['message']['content']
                            latest_response_data = json.loads(latest_response)
                            print(latest_response_data)
                            return latest_response_data
                except json.JSONDecodeError as e:
                    print(f"JSON parsing error: {e}")
                except Exception as e:
                    print(f"Unexpected error during OpenAI API call: {e}")
                    break
        return {"error": "Failed to process with OpenAI"}


    inputs = [{"role": "user", "content": f"{comment_list}"}]
    data = {
                "model": "gpt-4-1106-preview", # Cheapest and fastest model
                "messages": make_prompt(imprint_data, inputs),
                "temperature": 0.1,
                "max_tokens": 1000
            }

    api_result = asyncio.run(openai_api_call(data))
    print(api_result)
    return jsonify(api_result), 200 if "error" not in api_result else 500

# Card Component Post GPT draft to instagram
@app.route('/publish_reply', methods=['POST'])
def publish_reply():
    data = request.json
    comment_id = data.get('commentId')
    reply = data.get('reply')

    if not comment_id or not reply:
        return jsonify({'error': 'Missing comment ID or reply'}), 400

    creds = getCreds(session['access_token'])
    instagram_api = InstagramAPI(creds)
    try:
        response = instagram_api.postCommentReply(comment_id, reply)
        return jsonify(response)
    except Exception as e:
        print(f"Error posting reply: {e}")
        return jsonify({'error': str(e)}), 500
    
# TEST FOR INSTAGRAM WEBHOOK, IGNORE. WE WONT HAVE FULL ACCESS UNTIL BUSINESS VERIFICATION IS DONE.
@app.route('/webhook', methods=['GET', 'POST'])
def handle_webhook():
    if request.method == 'GET':
        mode = request.args.get('hub.mode')
        token = request.args.get('hub.verify_token')
        challenge = request.args.get('hub.challenge')
        if mode and token:
            if mode == 'subscribe' and token == 'test':
                print("WEBHOOK_VERIFIED")
                return challenge
            else:
                return Response("Verification token mismatch", status=403)
    elif request.method == 'POST':
        data = request.get_json()
        print(json.dumps(data, indent=4))
        return Response("Event received", status=200)
    
if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True, ssl_context=('localhost.crt', 'localhost.key'))
