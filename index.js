//librerias descargadas
const express = require('express');
const mysql = require('mysql');
const cors = require('cors'); 
const app = express(); 
const bodyParser = require('body-parser');
var cron = require('node-cron')
var sd = require('silly-datetime'); //libreria para formatear fecha y hora 

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

    const agendarReserva = "INSERT INTO reservaciones (fecha, horaInicio, horaFin, titular, sala, estado) VALUES (?, ?, ?, ?, ?, ?)";
    
    //se obtienen los horarios de la fecha para comprobar disponibilidad y de la sala
    bd.query("SELECT horaInicio, horaFin FROM reservaciones WHERE fecha = ? AND sala = ?", [fecha, sala], (err, data) => {
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
                   bd.query(agendarReserva, [fecha, horaInicio, horaFin, titular, sala, 'pendiente'], (err, res) => {
                        if(!err) {
                            //llamar a ordenarHorarios()
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

//cancelar reservacion manualmente
app.put("/api/cancelar/:id", (req, result) => {
    //id de la reservacion a cancelar
    const ID = req.params.id;

    const queryDelete = "UPDATE reservaciones SET estado = 'cancelada' WHERE reservaciones.id = ?"

    bd.query(queryDelete, [ID], (err, res) => {
        if(!err) result.json(`Reserva ${ID} cancelada`)
    })
}) 
 

//formato de fecha actual
var fechaActual =sd.format(new Date(), 'YYYY-MM-DD'); 
var diaActual = sd.format(new Date(), 'DD');

var horaInicioSunset = []; 
var horaFinSunset = []; 
var agendaReservacionesF = []; 
  
//metodo de ordenacion burbuja, ordena el array de menor a mayor
function metodoBurbuja(horarios) {
    var lista = horarios;
    var n, i, k, aux;
    n = lista.length;  
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

//ordenar horarios pendientes
function ordenarHorarios() { 
    bd.query("SELECT * FROM reservaciones WHERE fecha = ? AND estado = ? AND sala = ?", 
    [fechaActual, 'pendiente', 'sunset'], (err, data) => { 
        data.forEach(i => {
            if(!horaInicioSunset.includes(i.horaInicio)) horaInicioSunset.push(i.horaInicio);   
            if(!horaFinSunset.includes(i.horaFin)) horaFinSunset.push(i.horaFin);   
        })
        metodoBurbuja(horaInicioSunset);
    })  
} 

//obtiene horarios para actualizar las salas, funciona cada 30 min. 
cron.schedule('* * * * *', () => {
  var NHoraios = horaInicioSunset.length;
  console.log("No. 1", sd.format(new Date(), "HH:mm"));
  var i = 0;
  ordenarHorarios();
  var minutos = parseInt(horaInicioSunset[i].substr(3, 5));
  var hora = parseInt(horaInicioSunset[i].substr(0, 2));
  console.log(horaInicioSunset[i], hora, minutos);
 
  //marcar la sala sunset como ocupada
  cron.schedule(`${minutos} ${hora} ${diaActual} * *`, () => {
    bd.query(
      "UPDATE reservaciones SET estado = ? WHERE horaInicio = ?",
      ["En uso", horaInicioSunset[i]],
      (err) => {
        if (!err) { 
          if (i >= NHoraios) {
            console.log("ultimo horario actualizado con exito");
            i = NHoraios - 1;
          } else i++;
          console.log("actualizado con exito");
        } 
      }
    );
  });
 
  //marcar la sala como desocupada
  // cron.schedule(`${minutos} ${hora} * * *`, () => {

  // })
}); 
     
console.log(sd.format(new Date(), 'HH:mm'))