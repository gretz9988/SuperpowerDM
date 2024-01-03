import datetime
import json
import requests
from InstaAPI.defines import displayApiCallData, getCreds

class InstagramAPI:

	def __init__( self, creds ) :
		self.creds = creds


	def call(self, url, endpointParams, debug='no', method='GET'):
	# Handle API calls
		data = requests.get( url, endpointParams )

		if method == 'GET':
			data = requests.get(url, params=endpointParams)
		elif method == 'POST':
			data = requests.post(url, data=endpointParams)
		else:
			raise ValueError("Method not supported")

		response = dict()
		response['url'] = url
		response['endpoint_paras'] = endpointParams
		response['endpoint_paras_clean'] = json.dumps( endpointParams, indent = 4 )
		response['json_data'] = json.loads( data.content )
		response['json_paras_clean'] = json.dumps( response['json_data'], indent = 4 )

		if ( debug == 'yes' ) :
			displayApiCallData( response )

		return response


	def getId( self ) :
		""" Get facebook pages for a user

		API Endpoint:
			https://graph.facebook.com/{graph-api-version}/me/accounts?access_token={access-token}&fields=id,name,instagram_business_account

		returns:
			object: data from the endpoint

		"""
		self.creds['debug'] == 'yes'

		endpointParams = dict()
		endpointParams['fields'] = 'id,name,instagram_business_account{profile_picture_url}'
		endpointParams['access_token'] = self.creds['access_token']
		url = self.creds['endpoint_base'] + 'me/accounts'

		response = self.call( url, endpointParams, self.creds['debug'] )
		print('response: ', response)
		self.creds['insta_account_id'] = response['json_data']['data'][0]['instagram_business_account']['id']
		self.creds['name'] = response['json_data']['data'][0]['name']
		pfp = response['json_data']['data'][0]['instagram_business_account']['profile_picture_url']

		return self.creds['insta_account_id'], self.creds['name'], pfp


	def getContent(self, since_timestamp=None):
		"""
		Get Instagram Business information for a given Instagram Business ID.
		Only gets content after a defined timestamp (all for setup).
		Saves timestamp of the latest object and specifically the latest post.

		Parameters:
		since_timestamp (str): ISO 8601 formatted timestamp to filter posts. If None, fetch all posts.

		Returns:
		tuple: Instagram username and data from the endpoint
		"""

		self.creds['debug'] = 'no'

		endpointParams = dict()
		endpointParams['fields'] = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username'
		endpointParams['access_token'] = self.creds['access_token']
		endpointParams['instagram_business_id'] = self.creds['insta_account_id']

		url = self.creds['endpoint_base'] + self.creds['insta_account_id'] + '/media'

		response = self.call(url, endpointParams, self.creds['debug'])
		
		# Filter posts based on the timestamp
		filtered_data = []
		latest_timestamp = since_timestamp

		for post in response['json_data']['data']:
			post_timestamp = post['timestamp']

			if since_timestamp is None or post_timestamp > since_timestamp:
				filtered_data.append(post)
				if latest_timestamp is None or post_timestamp > latest_timestamp:
					latest_timestamp = post_timestamp

		self.creds['ig_username'] = response['json_data']['data'][0]['username']
		self.creds['latest_timestamp'] = latest_timestamp  # Save the latest timestamp

		return self.creds['ig_username'], filtered_data, self.creds['latest_timestamp']


	def getCommentsForMedia(self, media_id):
		""" Get comments from a media object and create a JSONL of user-specific comments.

		API Endpoint:
			https://graph.facebook.com/{graph-api-version}/{media-id}/comments?fields={fields}&access_token={access-token}

		Returns:
			tuple: All comments as a list and user-specific comments as a JSONL string.
		"""
		endpointParams = dict()
		endpointParams['fields'] = 'username,id,text,like_count,replies{username,text}'
		endpointParams['access_token'] = self.creds['access_token']
		
		url = self.creds['endpoint_base'] + media_id + '/comments'
		comments_response = self.call(url, endpointParams, self.creds['debug'])
		comments_data = comments_response['json_data']['data']
		
		
		all_comments = []
		for comment in comments_data:
			comment_info = {
				'username': comment['username'],
				'comment': comment['text'],
				'likes': comment['like_count'],
				'id': comment['id'],
				'replies': [{'username': reply['username'], 'text': reply['text']} 
                        for reply in comment.get('replies', {}).get('data', [])]
			}
			all_comments.append(comment_info)

		return all_comments
	
	def extractInstaImprint(self, username, content):
		"""
		Extracts user-specific content and comments from Instagram posts.

		Parameters:
		username (str): The username to filter the content and comments.
		content (list): List of content items (posts) obtained from getContent function.

		Returns:
		list: A list of dictionaries, each containing user-specific content and comments for a post.
		"""
		user_replies_list = []

		for post in content:
			# Process comments for the post
			comments = self.getCommentsForMedia(post['id'])
			for comment in comments:
				# Add user's replies
				for reply_text in comment.get('replies', []):
					if reply_text['username'] == username:
						user_reply = {
							"role": "user",
							"content": f"{{'comment': '{comment['comment']}', 'id': '{comment['id']}'}}"
						}
						assistant_reply = {
							"role": "assistant",
							"content": f"{{'comment': '{reply_text['text']}', 'id': '{comment['id']}'}}"
						}
						
						user_replies_list.extend([user_reply, assistant_reply])

		return user_replies_list
	
	def postCommentReply(self, comment_id, message):
		endpointParams = {
			'message': message,
			'access_token': self.creds['access_token']
		}

		url = self.creds['endpoint_base'] + comment_id + '/replies'
		response = self.call(url, endpointParams, self.creds['debug'], 'POST')
		return response['json_data']
