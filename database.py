import sqlite3


connection = sqlite3.connect("school.db")

cursor = connection.cursor()


# Create Students Table
cursor.execute("""
CREATE TABLE IF NOT EXISTS students (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    admission_no TEXT UNIQUE,

    first_name TEXT,

    middle_name TEXT,

    surname TEXT,

    gender TEXT,

    date_of_birth TEXT,

    class_name TEXT

)
""")


# Create Parents Table
cursor.execute("""
CREATE TABLE IF NOT EXISTS parents (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    student_id INTEGER,

    father_name TEXT,

    father_phone TEXT,

    mother_name TEXT,

    mother_phone TEXT,

    guardian_name TEXT,

    guardian_phone TEXT,

    address TEXT,

    gps_address TEXT,

    FOREIGN KEY(student_id) REFERENCES students(id)

)
""")


# Create Users Table
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    username TEXT UNIQUE,

    password TEXT,

    role TEXT

)
""")


connection.commit()

connection.close()


print("Database created successfully")