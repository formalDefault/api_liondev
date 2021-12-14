//librerias descargadas
const express = require('express');
const mysql = require('mysql');
const cors = require('cors'); 
const app = express(); 
const bodyParser = require('body-parser');
var sd = require('silly-datetime'); //libreria fecha y hora en formato

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//formato de fecha y hora actual
// var fechaActual=sd.format(new Date(), 'YYYY-MM-DD'); 
// var horaActual=sd.format(new Date(), 'HH:mm:ss'); 

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

//Se obtienen los elementos de la tabla reservas
app.get("/express/api/get", (err, result) => {
  db.query("SELECT * FROM reservas", (error, data) => {
    if (!error) {
      result.send(data);
    } else {
      console.log(error);
      throw error;
    }
  });
});

//agregar reservacion de sala
app.post("/express/api/insert", (req, result) => {

    //datos a recibir
    const titular = req.body.titular;
    const sala = req.body.sala;
    const fecha = req.body.fecha;
    const horaInicio = req.body.horaInicio;
    const horaFin = req.body.horaFin;  
    var disponibilidadSala = true;

    const agendarReserva = "INSERT INTO reservas (titular, sala, fecha, horaInicio, horaFin) VALUES (?,?,?,?,?)";
    
    //se obtienen los horarios de la fecha para comprobar disponibilidad
    db.query("SELECT horaInicio, horaFin FROM reservas WHERE fecha = ?", [fecha], (err, data) => {
        if (!err) { 

            //comprueba la disponibilidad de la sala en base a horario
            data.forEach(element => { 
                if(horaInicio >= element.horaInicio && horaFin <= element.horaFin) disponibilidadSala = false;
                else if(horaInicio <= element.horaFin && horaInicio >= element.horaInicio) disponibilidadSala = false;
                else if (horaFin >= element.horaInicio && horaInicio <= element.horaFin) disponibilidadSala = false;  
            });

            //si la sala esta disponible en el horario indicado se registra la reserva
            if(!disponibilidad){
                console.log("Ocupada")
            } else {
                console.log("libre")
                db.query(agendarReserva, [titular, sala, fecha, horaInicio, horaFin], (err, res) => {
                    if(!err) {
                        result.send("se reservo la sala");
                    } else {
                        console.log(err); 
                    }
                }) 
            } 
        console.log(data);
        } else {
        console.log(err);   
        }
    })
    
});  
 
