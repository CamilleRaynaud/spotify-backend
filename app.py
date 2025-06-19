from flask import Flask
from dotenv import load_dotenv
from routes.token import token_bp

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)

SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
app.register_blueprint(token_bp)

if __name__ == '__main__':
    app.run(port=5000)