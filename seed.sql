USE employee_organizer_db;

-- Department Seeds --

INSERT INTO department (name)
VALUES ('Development'), ('Accounting'), ('IT'), ('Human Resources');

-- Role Seeds --

INSERT INTO role (title, salary, department_id)
VALUES ('Development Director', 110000, 1), ('Development Associate', 60000, 1), ('CFO', 120000, 2), ('Accountant', 84000, 2), ('IT Manager', 90000, 3), ('HR Director', 110000, 4), ('HR Assistant', 45000, 4);

-- Employee Seeds --

INSERT INTO employee (first_name, last_name, role_id, manager_id) 
VALUES ('Rich', 'Purnell', 1, null), ('Dash', 'Rendar', 3, null), ('Marcus', 'Brody', 4, 2), ('Sirius', 'Black', 6, null), ('Mark', 'Watney', 2, 1), ('George', 'Banks', 2, 1);