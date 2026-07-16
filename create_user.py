import sqlite3
from werkzeug.security import generate_password_hash

# Connect to our database
connection = sqlite3.connect("school.db")
cursor = connection.cursor()

# Set details for the default admin account
username = "admin"
password = "password123"  # You can change this later!
hashed_password = generate_password_hash(password)
role = "Admin"

try:
    # Insert the user into the database
    cursor.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        (username, hashed_password, role),
    )
    connection.commit()
    print("--------------------------------------------------")
    print("Admin user created successfully!")
    print(f"Username: {username}")
    print(f"Password: {password}")
    print("--------------------------------------------------")
except sqlite3.IntegrityError:
    print("--------------------------------------------------")
    print("Admin user already exists in the database.")
    print("--------------------------------------------------")

connection.close()