from flask import Blueprint, request, jsonify
import requests
import os

token_bp = Blueprint('token', __name__)

@token_bp.route('/refresh-token', methods=['POST'])
def refresh_token():
    refresh_token = request.json.get('refresh_token')
    if not refresh_token:
        return jsonify({"error": "Missing refresh_token"}), 400

    client_id = os.getenv('SPOTIFY_CLIENT_ID')
    client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')

    response = requests.post('https://accounts.spotify.com/api/token', data={
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'client_id': client_id,
        'client_secret': client_secret,
    }, headers={
        'Content-Type': 'application/x-www-form-urlencoded',
    })

    return jsonify(response.json()), response.status_code
