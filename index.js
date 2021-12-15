//librerias descargadas
const express = require('express');
const mysql = require('mysql');
const cors = require('cors'); 
const app = express(); 
const bodyParser = require('body-parser');
var cron = require('node-cron')
var sd = require('silly-datetime'); //libreria fecha y hora en formato

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//formato de fecha y hora actual
var fechaActual=sd.format(new Date(), 'YYYY-MM-DD'); 

//configuraciones de puerto para express
app.set('port', process.env.PORT || 4000); 

app.listen(app.get('port'), () => {
    console.log(`Api iniciada, puerto:${app.get('port')}`);
}); 

//Conexion a la base de datos mysql
const bd = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'salasdejunta',
    port: 3306
}); 
module.exports = bd;

//Se obtienen los elementos de la tabla reservas
app.get("/api/get", (err, result) => {
  bd.query("SELECT * FROM reservas", (error, data) => {
    if (!error) {
      result.send(data);
    } else {
      console.log(error);
      throw error;
    }
  });
});

//agregar reservacion de sala
app.post("/api/insert", (req, result) => {

    //datos a recibir
    const { fecha, horaInicio, horaFin, titular, sala } = req.body;   
    var disponibilidadSala = true;

    const agendarReserva = "INSERT INTO reservas (titular, sala, fecha, horaInicio, horaFin) VALUES (?,?,?,?,?)";
    
    //se obtienen los horarios de la fecha para comprobar disponibilidad
    bd.query("SELECT horaInicio, horaFin FROM reservas WHERE fecha = ?", [fecha], (err, data) => {
        if (!err) { 

            //comprueba la disponibilidad de la sala en base a horario
            data.forEach(element => { 
                if(horaInicio >= element.horaInicio && horaFin <= element.horaFin) disponibilidadSala = false;
                else if(horaInicio <= element.horaFin && horaInicio >= element.horaInicio) disponibilidadSala = false;
                else if (horaFin >= element.horaInicio && horaInicio <= element.horaFin) disponibilidadSala = false;  
            });

            //si la sala esta disponible en el horario indicado se registra la reserva 
            if(!disponibilidadSala){
                result.json("Ocupada"); 
            } else {
                console.log("libre")
                //validacion para no reservar mas de dos horas
                let minInicio = parseInt(horaInicio.substr(horaFin.length -2)); //obtener los dos ultimos campos de un strign
                let minFinal = parseInt(horaFin.substr(horaFin.length -2)); 
                let limite = parseInt(horaInicio) + 2;
                let tiempoPedido = parseInt(horaFin); 

                if( tiempoPedido >= limite && minFinal > minInicio){ 
                    console.log("mas de dos horas")
                } else {
                    //query para registrar reserva en la bd
                   bd.query(agendarReserva, [titular, sala, fecha, horaInicio, horaFin], (err, res) => {
                        if(!err) {
                            result.send("se reservo la sala");
                        } else {
                            console.log(err); 
                        }
                    }) 
                } 
            } 
        } else result.send(err);   
    })
    

    function newFunction() {
        const titular = req.body.titular;
        const sala = req.body.sala;
        const fecha = req.body.fecha;
        const horaInicio = req.body.horaInicio;
        const horaFin = req.body.horaFin;
        return { fecha, horaInicio, horaFin, titular, sala };
    }
});  

app.delete("/api/delete/:id", (req, result) => {
    //id de la reservacion a eliminar
    const ID = req.params.id;

    const queryDelete = "DELETE FROM reservas WHERE reservas.id = ?"

    bd.query(queryDelete, [ID], (err, res) => {
        if(!err) result.json(`Reserva ${ID} borrada`)
    })
})
 
const newLocal = `05 * * * *`;
cron.schedule(newLocal, () => {
    let horaActual=sd.format(new Date(), 'HH:mm');  
    console.log(horaActual);
  });
