from flask import Flask
from flask_cors import CORS
from app.api_endpoints import api
from app.database import init_db
from app.email_server import auth_api

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})
    app.register_blueprint(api, url_prefix="/api")
    app.register_blueprint(auth_api, url_prefix="/api")

    with app.app_context():
        init_db()

    return app

if __name__ == "__main__":
    app = create_app()
    # إضافة host='0.0.0.0' ضرورية جداً هنا
    app.run(host='0.0.0.0', port=5000, debug=True)
    