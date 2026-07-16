import os
import sqlite3
import shutil
from flask import Flask, flash, redirect, render_template, request, session, send_file
from werkzeug.security import check_password_hash
import pandas as pd

app = Flask(__name__)
app.secret_key = "super_secret_magmax_key"

# Helper function to connect to school database
def get_db_connection():
    conn = sqlite3.connect("school.db")
    conn.row_factory = sqlite3.Row
    return conn

# 1. Main Route (Auto-redirect to login or dashboard)
@app.route('/')
def index():
    if 'username' in session:
        return redirect('/dashboard')
    return redirect('/login')

# 2. Login Page & Form Submission Handler
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        if user and check_password_hash(user['password'], password):
            session['username'] = user['username']
            session['role'] = user['role']
            return redirect('/dashboard')
        else:
            flash('Invalid Username or Password!')
            return redirect('/login')
            
    return render_template('login.html')

# 3. Dashboard Route (Protected)
@app.route('/dashboard')
def dashboard():
    if 'username' not in session:
        return redirect('/login')
        
    conn = get_db_connection()
    total_students = conn.execute('SELECT COUNT(*) FROM students').fetchone()[0]
    total_parents = conn.execute('SELECT COUNT(*) FROM parents').fetchone()[0]
    conn.close()
    
    return render_template('dashboard.html', total_students=total_students, total_parents=total_parents)

# 4. Add Student Page & Handler (Protected)
@app.route('/add-student', methods=['GET', 'POST'])
def add_student():
    if 'username' not in session:
        return redirect('/login')
        
    if request.method == 'POST':
        admission_no = request.form['admission_no']
        first_name = request.form['first_name']
        middle_name = request.form['middle_name']
        surname = request.form['surname']
        gender = request.form['gender']
        date_of_birth = request.form['date_of_birth']
        class_name = request.form['class_name']
        
        father_name = request.form['father_name']
        father_phone = request.form['father_phone']
        mother_name = request.form["mother_name"]
        mother_phone = request.form["mother_phone"]
        guardian_name = request.form["guardian_name"]
        guardian_phone = request.form["guardian_phone"]
        address = request.form['address']
        gps_address = request.form['gps_address']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO students (admission_no, first_name, middle_name, surname, gender, date_of_birth, class_name)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (admission_no, first_name, middle_name, surname, gender, date_of_birth, class_name))
            
            student_id = cursor.lastrowid
            
            cursor.execute('''
                INSERT INTO parents (student_id, father_name, father_phone, mother_name, mother_phone, guardian_name, guardian_phone, address, gps_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (student_id, father_name, father_phone, mother_name, mother_phone, guardian_name, guardian_phone, address, gps_address))
            
            conn.commit()
            flash('Student and Parent contact added successfully!', 'success')
            return redirect('/add-student')
            
        except sqlite3.IntegrityError:
            conn.rollback()
            flash('Error: A student with this Admission Number already exists!', 'danger')
        finally:
            conn.close()
            
    return render_template('add_student.html')

# 5. Search Directory Route (Protected)
@app.route('/directory')
def directory():
    if 'username' not in session:
        return redirect('/login')
        
    search_query = request.args.get('search', '').strip()
    class_filter = request.args.get('class_filter', '').strip()
    
    conn = get_db_connection()
    
    query = '''
        SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.surname, s.gender, s.class_name,
               p.father_name, p.father_phone, p.mother_name, p.mother_phone, p.guardian_name, p.guardian_phone
        FROM students s
        LEFT JOIN parents p ON s.id = p.student_id
        WHERE 1=1
    '''
    parameters = []
    
    if search_query:
        query += ''' AND (
            s.first_name LIKE ? OR 
            s.surname LIKE ? OR 
            s.admission_no LIKE ? OR 
            p.father_name LIKE ? OR 
            p.father_phone LIKE ? OR 
            p.mother_name LIKE ? OR 
            p.mother_phone LIKE ?
        )'''
        wildcard_search = f"%{search_query}%"
        parameters.extend([wildcard_search] * 7)
        
    if class_filter:
        query += " AND s.class_name = ?"
        parameters.append(class_filter)
        
    records = conn.execute(query, parameters).fetchall()
    conn.close()
    
    return render_template('directory.html', records=records, search_query=search_query, selected_class=class_filter)

# 6. Edit Student & Parent Records (Protected)
@app.route('/edit-student/<int:student_id>', methods=['GET', 'POST'])
def edit_student(student_id):
    if 'username' not in session:
        return redirect('/login')
        
    conn = get_db_connection()
    
    if request.method == 'POST':
        admission_no = request.form['admission_no']
        first_name = request.form['first_name']
        middle_name = request.form['middle_name']
        surname = request.form['surname']
        gender = request.form['gender']
        date_of_birth = request.form['date_of_birth']
        class_name = request.form['class_name']
        
        father_name = request.form['father_name']
        father_phone = request.form['father_phone']
        mother_name = request.form["mother_name"]
        mother_phone = request.form["mother_phone"]
        guardian_name = request.form["guardian_name"]
        guardian_phone = request.form["guardian_phone"]
        address = request.form['address']
        gps_address = request.form['gps_address']
        
        try:
            conn.execute('''
                UPDATE students 
                SET admission_no = ?, first_name = ?, middle_name = ?, surname = ?, gender = ?, date_of_birth = ?, class_name = ?
                WHERE id = ?
            ''', (admission_no, first_name, middle_name, surname, gender, date_of_birth, class_name, student_id))
            
            conn.execute('''
                UPDATE parents 
                SET father_name = ?, father_phone = ?, mother_name = ?, mother_phone = ?, guardian_name = ?, guardian_phone = ?, address = ?, gps_address = ?
                WHERE student_id = ?
            ''', (father_name, father_phone, mother_name, mother_phone, guardian_name, guardian_phone, address, gps_address, student_id))
            
            conn.commit()
            return redirect('/directory')
        except sqlite3.IntegrityError:
            conn.rollback()
            flash('Error: That Admission Number is already in use by another student!')
            
    student = conn.execute('''
        SELECT s.*, p.father_name, p.father_phone, p.mother_name, p.mother_phone, p.guardian_name, p.guardian_phone, p.address, p.gps_address
        FROM students s
        LEFT JOIN parents p ON s.id = p.student_id
        WHERE s.id = ?
    ''', (student_id,)).fetchone()
    
    conn.close()
    return render_template('edit_student.html', student=student)

# 7. Delete Student & Parent Records (Protected)
@app.route('/delete-student/<int:student_id>')
def delete_student(student_id):
    if 'username' not in session:
        return redirect('/login')
        
    conn = get_db_connection()
    conn.execute('DELETE FROM parents WHERE student_id = ?', (student_id,))
    conn.execute('DELETE FROM students WHERE id = ?', (student_id,))
    conn.commit()
    conn.close()
    
    return redirect('/directory')

# 8. Export Directory to Excel
@app.route('/export-excel')
def export_excel():
    if 'username' not in session:
        return redirect('/login')
        
    conn = get_db_connection()
    query = '''
        SELECT s.admission_no AS [Admission No], s.first_name AS [First Name], s.middle_name AS [Middle Name], s.surname AS [Surname], 
               s.gender AS [Gender], s.date_of_birth AS [DOB], s.class_name AS [Class],
               p.father_name AS [Father Name], p.father_phone AS [Father Phone], 
               p.mother_name AS [Mother Name], p.mother_phone AS [Mother Phone], 
               p.guardian_name AS [Guardian Name], p.guardian_phone AS [Guardian Phone], 
               p.address AS [Address], p.gps_address AS [GPS Address]
        FROM students s
        LEFT JOIN parents p ON s.id = p.student_id
    '''
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    # Save the dataframe to a temporary Excel file
    excel_path = "magmax_parent_contacts.xlsx"
    df.to_excel(excel_path, index=False)
    
    return send_file(excel_path, as_attachment=True)

# 9. Download Database Backup File
@app.route('/backup-db')
def backup_db():
    if 'username' not in session:
        return redirect('/login')
        
    return send_file("school.db", as_attachment=True, download_name="magmax_school_backup.db")

# 10. Restore Database File
@app.route('/restore-db', methods=['POST'])
def restore_db():
    if 'username' not in session:
        return redirect('/login')
        
    if 'backup_file' not in request.files:
        flash('No file selected!', 'danger')
        return redirect('/dashboard')
        
    file = request.files['backup_file']
    if file.filename == '':
        flash('No file selected!', 'danger')
        return redirect('/dashboard')
        
    if file and file.filename.endswith('.db'):
        # Overwrite the existing school.db file safely
        file.save("school.db")
        flash('Database restored successfully from backup!', 'success')
    else:
        flash('Invalid file type! Please upload a valid .db backup file.', 'danger')
        
    return redirect('/dashboard')

# 11. Logout Handler
@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

if __name__ == '__main__':
    app.run(debug=True)