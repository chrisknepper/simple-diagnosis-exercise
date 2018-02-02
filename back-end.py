from flask import Flask, jsonify, make_response, request
import csv
import os.path
from shutil import copy2

MASTER_SYMPTOMS_FILE = 'symptoms.txt'
DATABASE_FILE = 'symptoms_with_counts.txt'

app = Flask(__name__)

# Routes
@app.route("/full_list")
def full_list():
    return jsonify(get_symptoms_list())

@app.route("/select_diagnosis_for_symptom", methods=['POST'])
def select_diagnosis_for_symptom():
    form = request.get_json()
    selected_symptom = form['symptom']
    return jsonify(get_symptoms_list(selected_symptom))

@app.route("/update_diagnosis_count", methods=['POST'])
def update_diagnosis_count():
    form = request.get_json()
    selected_symptom = form['symptom']
    selected_diagnosis = form['diagnosis']
    return jsonify(update_symptoms_list_count(selected_symptom, selected_diagnosis))

# Helpers
def get_symptoms_list(include=None):
    f = open(DATABASE_FILE, "r")
    set_of_lists = {}
    dataset_csv = csv.reader(f)
    for line in dataset_csv:
        set_of_lists[line[0]] = [s.strip() for i,s in enumerate(line) if i != 0]
    f.close()

    if not include:
        return set_of_lists
    elif include in set_of_lists.keys():
        return set_of_lists[include]
    return []

def update_symptoms_list_count(selected_symptom, selected_diagnosis):
    new_lines = []
    with open(DATABASE_FILE, "rb") as f:
        dataset_csv = csv.reader(f)
        for line in dataset_csv:
            new_line = []
            if line[0] == selected_symptom:
                print('found the db line with the symptom')
                for item in line:
                    if selected_diagnosis in item:
                        print('found the db column with the diagnosis, incrementing count')
                        new_item = item = item[:-1] + str(int(item[-1:]) + 1)
                    else:
                        new_item = item
                    new_line.append(new_item)
                new_lines.append(new_line)
            else:
                new_lines.append(line)
        print(new_lines)

    with open(DATABASE_FILE, 'wb') as f:
        writer = csv.writer(f)
        writer.writerows(new_lines)

    return get_symptoms_list(selected_symptom)


def make_master_symptoms_list():
    copy2(MASTER_SYMPTOMS_FILE, DATABASE_FILE)

    new_lines = []
    with open(MASTER_SYMPTOMS_FILE, "rb") as f:
        dataset_csv = csv.reader(f)
        for line in dataset_csv:
            new_line = []
            for index,item in enumerate(line):
                if index != 0:
                    new_item = item + ":0"
                else:
                    new_item = item
                new_line.append(new_item)
            new_lines.append(new_line)

    with open(DATABASE_FILE, 'wb') as f:
        writer = csv.writer(f)
        writer.writerows(new_lines)


def ensure_symptom_file_exists():
    if not os.path.exists(DATABASE_FILE):
        make_master_symptoms_list()

@app.after_request
def after_request(response):
  response.headers.add('Access-Control-Allow-Origin', '*')
  response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  return response

if __name__ == "__main__":
    ensure_symptom_file_exists()
    app.run(port=1337)
