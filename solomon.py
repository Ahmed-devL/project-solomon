from flask import Flask, send_from_directory

# Tell Flask that the 'ui' folder is where all the static files live
app = Flask(__name__, static_folder='ui', static_url_path='')

# Route the main URL to the index.html inside the ui folder
@app.route('/')
def index():
    return send_from_directory('ui', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)