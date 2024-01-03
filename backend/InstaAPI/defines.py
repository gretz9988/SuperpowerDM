import requests
import json

def getCreds( token ) :
	creds = dict()
	creds['access_token'] = token
	creds['client_id'] = '1079236933072082'
	creds['client_secret'] = '9e2c4aaa863398978fcde7082fa80b61'
	creds['graph_domain'] = 'https://graph.facebook.com/'
	creds['graph_version'] = 'v18.0'
	creds['endpoint_base'] = creds['graph_domain'] + creds['graph_version'] + '/'
	creds['debug'] = 'no'
	creds['page_id'] = ''
	creds['insta_account_id'] = ''
	creds['ig_username'] = ''
	creds['name'] = ''

	return creds 

def apiCall( url, endpointParams, debug = 'no' ) :
	data = requests.get( url, endpointParams )

	response = dict()
	response['url'] = url
	response['endpoint_paras'] = endpointParams
	response['endpoint_paras_clean'] = json.dumps( endpointParams, indent = 4 )
	response['json_data'] = json.loads( data.content )
	response['json_paras_clean'] = json.dumps( response['json_data'], indent = 4 )

	if ( debug == 'yes' ) :
		displayApiCallData( response )

	return response

def displayApiCallData( response ) :
	print("\nURL: ")
	print(response['url'])
	print("\nEndpoint Params: ")
	print(response['endpoint_paras_clean'])
	print("\nResponse: ")
	print(response['json_paras_clean'])
