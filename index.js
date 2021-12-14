//librerias descargadas
const express = require('express');
const mysql = require('mysql');
const app = express(); 
const cors = require('cors'); 
 
app.use(cors());
app.use(express.json());

//configuraciones de puerto para express
app.set('port', process.env.PORT || 4000); 

app.listen(app.get('port'), () => {
    console.log(`Api iniciada, puerto:${app.get('port')}`);
}); 

//Conexion a la base de datos mysql
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'salasdejunta',
    port: 3306
}); 
module.exports = db;

db.query("SELECT * FROM reservas", (error, data) => {
    if(!error) {
        console.log(data);
    }
})