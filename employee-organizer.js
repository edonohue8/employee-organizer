// Dependencies

const mysql = require("mysql");
const inquirer = require("inquirer");
const cTable = require("console.table");


// Creating connection

class Database {
    constructor(config) {
        this.connection = mysql.createConnection(config);
    }

    query(sql, args) {
        return new Promise((resolve, reject) => {
            this.connection.query(sql, args, (err, rows) => {
                if (err)
                    return reject(err);
                resolve(rows);
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.connection.end(err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
}

// Connection properties

const db = new Database({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "employee_organizer_db"
});

// Employee table

async function showEmployeeSummary() {
    console.log(' ');
    await db.query('SELECT e.id, e.first_name AS First_Name, e.last_name AS Last_Name, title AS Title, salary AS Salary, name AS Department, CONCAT(m.first_name, " ", m.last_name) AS Manager FROM employee e LEFT JOIN employee m ON e.manager_id = m.id INNER JOIN role r ON e.role_id = r.id INNER JOIN department d ON r.department_id = d.id', (err, res) => {
        if (err) throw err;
        console.table(res);
        runApp();
    });
};

// Table for roles and departments

async function showRoleSummary() {
    console.log(' ');
    await db.query('SELECT r.id, title, salary, name AS department FROM role r LEFT JOIN department d ON department_id = d.id', (err, res) => {
        if (err) throw err;
        console.table(res);
        runApp();
    })
};

// Table for departments

async function showDepartments() {
    console.log(' ');
    await db.query('SELECT id, name AS department FROM department', (err, res) => {
        if (err) throw err;
        console.table(res);
        runApp();
    })
};

// Prevent empty space

async function confirmStringInput(input) {
    if ((input.trim() != "") && (input.trim().length <= 30)) {
        return true;
    }
    return "Error.  Must be 30 characters or less."
};

// Add employee

async function addEmployee() {
    let positions = await db.query('SELECT id, title FROM role');
    let managers = await db.query('SELECT id, CONCAT(first_name, " ", last_name) AS Manager FROM employee');
    managers.unshift({ id: null, Manager: "None" });

    inquirer.prompt([
        {
            name: "firstName",
            type: "input",
            message: "What is the employee's first name?",
            validate: confirmStringInput
        },
        {
            name: "lastName",
            type: "input",
            message: "What is the employee's last name?",
            validate: confirmStringInput
        },
        {
            name: "role",
            type: "list",
            message: "What is the employee's role?",
            choices: positions.map(obj => obj.title)
        },
        {
            name: "manager",
            type: "list",
            message: "Who is the employee's manager?",
            choices: managers.map(obj => obj.Manager)
        }
    ]).then(answers => {
        let positionDetails = positions.find(obj => obj.title === answers.role);
        let manager = managers.find(obj => obj.Manager === answers.manager);
        db.query("INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES (?)", [[answers.firstName.trim(), answers.lastName.trim(), positionDetails.id, manager.id]]);
        console.log("\x1b[32m", `${answers.firstName} has been added to the database.`);
        runApp();
    });
};

// Remove employee

async function removeEmployee() {
    let employees = await db.query('SELECT id, CONCAT(first_name, " ", last_name) AS name FROM employee');
    employees.push({ id: null, name: "Cancel" });

    inquirer.prompt([
        {
            name: "employeeName",
            type: "list",
            message: "Which employee would you like to remove?",
            choices: employees.map(obj => obj.name)
        }
    ]).then(response => {
        if (response.employeeName != "Cancel") {
            let removeEmployee = employees.find(obj => obj.name === response.employeeName);
            db.query("DELETE FROM employee WHERE id=?", removeEmployee.id);
            console.log("\x1b[32m", `${response.employeeName} has been removed from the database.`);
        }
        runApp();
    })
};

// Change employee's manager

async function updateManager() {
    let employees = await db.query('SELECT id, CONCAT(first_name, " ", last_name) AS name FROM employee');
    employees.push({ id: null, name: "Cancel" });

    inquirer.prompt([
        {
            name: "empName",
            type: "list",
            message: "Which employee would you like to update?",
            choices: employees.map(obj => obj.name)
        }
    ]).then(employeeInfo => {
        if (employeeInfo.empName == "Cancel") {
            runApp();
            return;
        }
        let managers = employees.filter(currEmployee => currEmployee.name != employeeInfo.empName);
        for (i in managers) {
            if (managers[i].name === "Cancel") {
                managers[i].name = "None";
            }
        };

        inquirer.prompt([
            {
                name: "mgName",
                type: "list",
                message: "Who is the employee's new manager?",
                choices: managers.map(obj => obj.name)
            }
        ]).then(managerInfo => {
            let empID = employees.find(obj => obj.name === employeeInfo.empName).id
            let mgID = managers.find(obj => obj.name === managerInfo.mgName).id
            db.query("UPDATE employee SET manager_id=? WHERE id=?", [mgID, empID]);
            console.log("\x1b[32m", `${employeeInfo.empName}'s new manager is ${managerInfo.mgName}.`);
            runApp();
        })
    })
};

// Update employee's role

async function updateEmployeeRole() {
    let employees = await db.query('SELECT id, CONCAT(first_name, " ", last_name) AS name FROM employee');
    employees.push({ id: null, name: "Cancel" });
    let roles = await db.query('SELECT id, title FROM role');

    inquirer.prompt([
        {
            name: "empName",
            type: "list",
            message: "Which employee would you like to update?",
            choices: employees.map(obj => obj.name)
        },
        {
            name: "newRole",
            type: "list",
            message: "What is the employee's new role?",
            choices: roles.map(obj => obj.title)
        }
    ]).then(answers => {
        if (answers.empName != "Cancel") {
            let empID = employees.find(obj => obj.name === answers.empName).id
            let roleID = roles.find(obj => obj.title === answers.newRole).id
            db.query("UPDATE employee SET role_id=? WHERE id=?", [roleID, empID]);
            console.log("\x1b[32m", `${answers.empName}'s new role is ${answers.newRole}.`);
        }
        runApp();
    })
};

// Add new role

async function addRole() {
    let departments = await db.query('SELECT id, name FROM department');

    inquirer.prompt([
        {
            name: "roleName",
            type: "input",
            message: "What is the new role?",
            validate: confirmStringInput
        },
        {
            name: "salaryNum",
            type: "input",
            message: "What is the new role's salary?",
            validate: input => {
                if (!isNaN(input)) {
                    return true;
                }
                return "Error: invalid character(s)."
            }
        },
        {
            name: "roleDepartment",
            type: "list",
            message: "What is the new role's department?",
            choices: departments.map(obj => obj.name)
        }
    ]).then(answers => {
        let depID = departments.find(obj => obj.name === answers.roleDepartment).id
        db.query("INSERT INTO role (title, salary, department_id) VALUES (?)", [[answers.roleName, answers.salaryNum, depID]]);
        console.log("\x1b[32m", `${answers.roleName} was added to ${answers.roleDepartment}.`);
        runApp();
    })
};

// Update role

async function updateRole() {
    let roles = await db.query('SELECT id, title FROM role');
    roles.push({ id: null, title: "Cancel" });
    let departments = await db.query('SELECT id, name FROM department');

    inquirer.prompt([
        {
            name: "roleName",
            type: "list",
            message: "Which role would you like to update?",
            choices: roles.map(obj => obj.title)
        }
    ]).then(response => {
        if (response.roleName == "Cancel") {
            runApp();
            return;
        }
        inquirer.prompt([
            {
                name: "salaryNum",
                type: "input",
                message: "What is the role's salary?",
                validate: input => {
                    if (!isNaN(input)) {
                        return true;
                    }
                    return "Error: invalid character(s)."
                }
            },
            {
                name: "roleDepartment",
                type: "list",
                message: "What is the role's department?",
                choices: departments.map(obj => obj.name)
            }
        ]).then(answers => {
            let depID = departments.find(obj => obj.name === answers.roleDepartment).id
            let roleID = roles.find(obj => obj.title === response.roleName).id
            db.query("UPDATE role SET title=?, salary=?, department_id=? WHERE id=?", [response.roleName, answers.salaryNum, depID, roleID]);
            console.log("\x1b[32m", `${response.roleName} was updated in the database.`);
            runApp();
        })
    })
};

// Remove role

async function removeRole() {
    let roles = await db.query('SELECT id, title FROM role');
    roles.push({ id: null, title: "Cancel" });

    inquirer.prompt([
        {
            name: "roleName",
            type: "list",
            message: "Which role would you like to remove?",
            choices: roles.map(obj => obj.title)
        }
    ]).then(response => {
        if (response.roleName != "Cancel") {
            let noMoreRole = roles.find(obj => obj.title === response.roleName);
            db.query("DELETE FROM role WHERE id=?", noMoreRole.id);
            console.log("\x1b[32m", `${response.roleName} was removed from the database.`);
        }
        runApp();
    })
};

// Add new department

async function addDepartment() {
    inquirer.prompt([
        {
            name: "depName",
            type: "input",
            message: "What is the name of the new department?",
            validate: confirmStringInput
        }
    ]).then(answers => {
        db.query("INSERT INTO department (name) VALUES (?)", [answers.depName]);
        console.log("\x1b[32m", `${answers.depName} was added to departments in the database.`);
        runApp();
    })
};

// Remove department

async function removeDepartment() {
    let departments = await db.query('SELECT id, name FROM department');
    departments.push({ id: null, name: "Cancel" });

    inquirer.prompt([
        {
            name: "depName",
            type: "list",
            message: "Which department would you like to remove?",
            choices: departments.map(obj => obj.name)
        }
    ]).then(response => {
        if (response.depName != "Cancel") {
            let uselessDepartment = departments.find(obj => obj.name === response.depName);
            db.query("DELETE FROM department WHERE id=?", uselessDepartment.id);
            console.log("\x1b[32m", `${response.depName} was removed from the database.`);
        }
        runApp();
    })
};

// Changes to employees

function editEmployeeOptions() {
    inquirer.prompt({
        name: "editChoice",
        type: "list",
        message: "What would you like to update?",
        choices: [
            "Add A New Employee",
            "Change Employee Role",
            "Change Employee Manager",
            "Remove An Employee",
            "Return To Main Menu"
        ]
    }).then(response => {
        switch (response.editChoice) {
            case "Add A New Employee":
                addEmployee();
                break;
            case "Change Employee Role":
                updateEmployeeRole();
                break;
            case "Change Employee Manager":
                updateManager();
                break;
            case "Remove An Employee":
                removeEmployee();
                break;
            case "Return To Main Menu":
                runApp();
                break;
        }
    })
};

// Changes to roles

function editRoleOptions() {
    inquirer.prompt({
        name: "editRoles",
        type: "list",
        message: "What would you like to update?",
        choices: [
            "Add A New Role",
            "Update A Role",
            "Remove A Role",
            "Return To Main Menu"
        ]
    }).then(responses => {
        switch (responses.editRoles) {
            case "Add A New Role":
                addRole();
                break;
            case "Update A Role":
                updateRole();
                break;
            case "Remove A Role":
                removeRole();
                break;
            case "Return To Main Menu":
                runApp();
                break;
        }
    })
};

// Changes to departments

function editDepartmentOptions() {
    inquirer.prompt({
        name: "editDeps",
        type: "list",
        message: "What would you like to update?",
        choices: [
            "Add A New Department",
            "Remove A Department",
            "Return To Main Menu"
        ]
    }).then(responses => {
        switch (responses.editDeps) {
            case "Add A New Department":
                addDepartment();
                break;
            case "Remove A Department":
                removeDepartment();
                break;
            case "Return To Main Menu":
                runApp();
                break;
        }
    })
};

// Main loop

function runApp() {
    inquirer.prompt({
        name: "mainmenu",
        type: "list",
        message: "What would you like to do?",
        choices: [
            "View All Employees",
            "Edit Employeee Info",
            "View Roles",
            "Edit Roles",
            "View Departments",
            "Edit Departments"
        ]
    }).then(responses => {
        switch (responses.mainmenu) {
            case "View All Employees":
                showEmployeeSummary();
                break;
            case "Edit Employeee Info":
                editEmployeeOptions();
                break;
            case "View Roles":
                showRoleSummary();
                break;
            case "Edit Roles":
                editRoleOptions();
                break;
            case "View Departments":
                showDepartments();
                break;
            case "Edit Departments":
                editDepartmentOptions();
                break;
        }
    });
}

runApp();