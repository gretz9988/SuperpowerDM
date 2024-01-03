import requests
import os
import re
import json
from dotenv import load_dotenv
from collections import defaultdict
from dateutil.parser import parse

load_dotenv()

Bearer = os.getenv('TWITTER_BEARER')    

class xAPI:
    def __init__(self):
        self.bearer_token = Bearer
        
    def get_user_data(self, userid, username):
        TIMELINES_URL = f"https://api.twitter.com/2/users/{userid}/tweets"
    
        headers = {
            "Authorization": f"Bearer {Bearer}",
            "User-Agent": "TwitterAPIv2Python"
        }

        params = {
            "max_results": "100",
            "tweet.fields": "text,conversation_id,author_id",
            "expansions": "referenced_tweets.id,referenced_tweets.id.author_id",
            "user.fields": "username"
        }

        response = requests.get(TIMELINES_URL, headers=headers, params=params)
        response_json = response.json()
        
        if response.status_code != 200:
            raise Exception(f"Tweets fetch error: {response.status_code}, {response.text}")

        # Extract tweets and referenced tweets
        tweets = response_json.get('data', [])
        referenced_tweets = {t["id"]: t for t in response_json.get('includes', {}).get('tweets', [])}
        users = {u["id"]: u for u in response_json.get('includes', {}).get('users', [])}  # Map of user IDs to user details
        tweet_ids = set(tweet['id'] for tweet in tweets)

        # Group tweets by conversation_id
        conversations = defaultdict(list)
        for tweet in tweets:
            conv_id = tweet['conversation_id']
            tweet_text = f"{username} said: " + tweet['text']
            
            # Check and group referenced tweets (like comments or replies)
            replies = []
            if 'referenced_tweets' in tweet:
                if any(rt.get('type') == 'retweeted' for rt in tweet['referenced_tweets']):
                        continue
                for ref_tweet in tweet['referenced_tweets']:
                    ref_tweet_id = ref_tweet['id']
                    if ref_tweet_id in referenced_tweets and ref_tweet_id not in tweet_ids:
                        ref_author_id = referenced_tweets[ref_tweet_id].get('author_id')
                        ref_author_username = users.get(ref_author_id, {}).get('username', 'commenter')
                        ref_tweet_text = f"@{ref_author_username + ' commented'}: {referenced_tweets[ref_tweet_id].get('text')}"
                        replies.append(ref_tweet_text)
            
            if replies:
                print(replies, '<----------------------------------------')
                conversations[conv_id].append(replies + [tweet_text])
            else:
                conversations[conv_id].append(tweet_text)

        # Reverse the order of tweets within each conversation
        for conv_id in conversations:
            conversations[conv_id].reverse()

        # Format the output
        threads = {f"@{username}'s thread {conv_id}": conversations[conv_id] for conv_id in conversations}

        return json.dumps(threads, indent=4)