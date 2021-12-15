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

var hora = [];

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

//Se obtienen los elementos de la tabla reservaciones
app.get("/api/get", (err, result) => {
  bd.query("SELECT * FROM reservaciones", (error, data) => {
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
    const titular = req.body.titular;
    const sala = req.body.sala;
    const fecha = req.body.fecha;
    const horaInicio = req.body.horaInicio;
    const horaFin = req.body.horaFin;   
    var disponibilidadSala = true;

    const agendarReserva = "INSERT INTO reservaciones (fecha, horaInicio, horaFin, titular, sala) VALUES (?, ?, ?, ?, ?)";
    
    //se obtienen los horarios de la fecha para comprobar disponibilidad
    bd.query("SELECT horaInicio, horaFin FROM reservaciones WHERE fecha = ?", [fecha], (err, data) => {
        if (!err ) {  
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
                //validacion para no reservar mas de dos horas
                let minInicio = parseInt(horaInicio.substr(horaFin.length -2)); //obtener los dos ultimos campos de un strign
                let minFinal = parseInt(horaFin.substr(horaFin.length -2)); 
                let limite = parseInt(horaInicio) + 2;
                let tiempoPedido = parseInt(horaFin); 

                if( tiempoPedido > limite || tiempoPedido == limite && minFinal > minInicio ){ 
                    console.log("mas de dos horas")
                } else { 
                    // query para registrar reserva en la bd
                   bd.query(agendarReserva, [fecha, horaInicio, horaFin, titular, sala], (err, res) => {
                        if(!err) {
                            //llamar a algo()
                            result.send("se reservo la sala");
                        } else {
                            console.log(err); 
                        }
                    }) 
                }
            } 
        } else result.send(err);   
    }) 
});  

app.delete("/api/delete/:id", (req, result) => {
    //id de la reservacion a eliminar
    const ID = req.params.id;

    const queryDelete = "DELETE FROM reservaciones WHERE reservaciones.id = ?"

    bd.query(queryDelete, [ID], (err, res) => {
        if(!err) result.json(`Reserva ${ID} borrada`)
    })
}) 

//formato de fecha actual
var fechaActual =sd.format(new Date(), 'YYYY-MM-DD'); 
var horaActual = sd.format(new Date(), 'HH:mm');

var agendaReservacionesI = []; 
var agendaReservacionesF = []; 
  
function Burbuja() {
    var lista = agendaReservacionesI;
    var n, i, k, aux;
    n = lista.length; 
    // Algoritmo de ordenacion burbuja
    for (k = 1; k < n; k++) {
        for (i = 0; i < (n - k); i++) {
            if (lista[i] > lista[i + 1]) {
                aux = lista[i];
                lista[i] = lista[i + 1];
                lista[i + 1] = aux;
            }
        }
    }  
}

function algo() { 
    bd.query("SELECT * FROM reservaciones WHERE fecha = ?", [fechaActual], (err, data) => { 
        data.forEach(i => {
            if(!agendaReservacionesI.includes(i.horaInicio)) agendaReservacionesI.push(i.horaInicio);   
        })
        Burbuja();
    })  
}

//obtiene horarios para actualizar las salas, funciona cada 30 min. 
cron.schedule('* * * * *', () => {
    console.log("No. 1",sd.format(new Date(), 'HH:mm')); 
    var i = 1;
    algo(); 
    var minutos = parseInt(agendaReservacionesI[i].substr(3,5));
    var hora = parseInt(agendaReservacionesI[i].substr(1,2));
    console.log(agendaReservacionesI, hora, minutos); 

    //marcar la sala como ocupada
    cron.schedule(`${minutos} ${hora} * * *`, () => { 
        bd.query("UPDATE reservaciones SET estado = ? WHERE horaInicio = ?", ['En uso', agendaReservacionesI[i]], (err) => {
            if(!err) console.log("actualizado con exito")
        }) 
    })

    //marcar la sala como desocupada
    // cron.schedule(`${minutos} ${hora} * * *`, () => {

    // })
}); 
     
console.log(horaActual)