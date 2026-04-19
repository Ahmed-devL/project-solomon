from flask import Flask, render_template

# Solomon's Waiter: Serving the UI from the 'ui' folder
app = Flask(__name__, template_folder='ui', static_folder='ui')

@app.route('/')
def index():
    # This route will serve the index.html that Antigravity generates
    return render_template('index.html')

if __name__ == '__main__':
    # Solomon listens on Port 5000 for your commands
    app.run(host='0.0.0.0', port=5000, debug=True)

