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

//formato de fecha actual
var fechaActual =sd.format(new Date(), 'YYYY-MM-DD'); 
var diaActual = sd.format(new Date(), 'DD');

//horarios sala sunset
var horaInicioSunset = []; 
var horaFinSunset = [];  
//horarios sala future
var horaInicioFuture = []; 
var horaFinFuture = [];  
//horarios sala nature
var horaInicioNature = []; 
var horaFinNature = [];  

//configuraciones de puerto para express
app.set('port', process.env.PORT || 4000); 
app.listen(app.get('port'), () => {
    console.log(`Api iniciada, puerto:${app.get('port')}`);
}); 

//Conexion a la base de datos mysql
const bd = mysql.createConnection({
    host: 'bjct1tiq2chiydxss0k4-mysql.services.clever-cloud.com',
    user: 'ur6kb5tmw8gakyyl',
    password: 'pFdTd5SgxPceaHSQ92MQ',
    database: 'bjct1tiq2chiydxss0k4',
    port: 3306
}); 
module.exports = bd;

//Se obtienen los elementos de la tabla reservaciones
app.get("/api/get", async (req, result) => {
    const dbCall = () => {
        try {
            bd.query("SELECT * FROM reservaciones", (error, data) => {
                if (error)
                    throw error;
                result.json(data);
            });
        } catch (e) {
            console.log(e);
        }
    }
    await dbCall(); 
}); 

//agregar reservacion de sala
app.post("/api/insert", async (req, result) => {
  //datos a recibir
  const titular = req.body.titular;
  const sala = req.body.sala;
  const fecha = req.body.fecha;
  const horaInicio = req.body.horaInicio;
  const horaFin = req.body.horaFin;
  var disponibilidadSala = true;

  const agendarReserva = "INSERT INTO reservaciones (fecha, horaInicio, horaFin, titular, sala, estado) VALUES (?, ?, ?, ?, ?, ?)";

  //se obtienen los horarios de la fecha para comprobar disponibilidad y de la sala
  const dbCall = () => {
    bd.query(
        "SELECT horaInicio, horaFin FROM reservaciones WHERE fecha = ? AND sala = ?",
        [fecha, sala],
        (err, data) => {
        try {
            if (!err) {
            //comprueba la disponibilidad de la sala en base a horario
            data.forEach((element) => {
                if (horaInicio >= element.horaInicio && horaFin <= element.horaFin)
                disponibilidadSala = false;
                else if (
                horaInicio <= element.horaFin &&
                horaInicio >= element.horaInicio
                )
                disponibilidadSala = false;
                else if (
                horaFin >= element.horaInicio &&
                horaInicio <= element.horaFin
                )
                disponibilidadSala = false;
            });

            //si la sala esta disponible en el horario indicado se registra la reserva
            if (disponibilidadSala) {
                let minInicio = parseInt(horaInicio.substr(horaFin.length - 2)); //obtener los dos ultimos campos de un strign
                let minFinal = parseInt(horaFin.substr(horaFin.length - 2));
                let limite = parseInt(horaInicio) + 2;
                let tiempoPedido = parseInt(horaFin);

                //validacion para no reservar mas de dos horas
                if ( tiempoPedido > limite || (tiempoPedido == limite && minFinal > minInicio) ) {
                  result.json("No se pueden reservar mas de dos horas");
                } else {
                  //verificar que la fecha no sea anterior a la actual
                  if ( horaInicio < sd.format(new Date(), "HH:mm") || fecha < fechaActual ) {
                    result.json("Elija un horario valido");
                  } else {
                    // query para registrar reserva en la bd
                    bd.query(
                      agendarReserva,
                      [fecha, horaInicio, horaFin, titular, sala, "pendiente"],
                      (err, res) => {
                        if (err) throw err;
                        result.json("Se reservo la sala");
                      }
                    );
                  }
                  
                }
            } else result.json("Ocupada");
            } else throw err;
        } catch (error) {
            console.log(error);
        }
        }
    );
  } 
  await dbCall();
});  

//cancelar reservacion manualmente
app.put("/api/cancelar/:id", async (req, result) => {  
    const dbCall = () => {
        try {
            const ID = req.params.id;
            const queryDelete = "UPDATE reservaciones SET estado = 'cancelada' WHERE reservaciones.id = ?";
            bd.query(queryDelete, [ID], (err, res) => {
                if (err)throw err;
                result.json(`Reserva ${ID} cancelada`);
            });
        } catch (error) {
            console.log(error);
        }
    }
    await dbCall();
})  
  
//metodo de ordenacion burbuja, ordena el array de menor a mayor
function ordenacionBurbuja(horarios) {
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
  
//ordenar horarios en uso
const ordenarHorarios = async (sala) => { 
    function dbCall() {
        bd.query("SELECT * FROM reservaciones WHERE fecha = ? AND sala = ? AND estado = ? OR estado = ?", 
        [ fechaActual, sala, 'pendiente', 'En uso' ], (err, data) => { 
            data.forEach(i => {
              if(sala === 'sunset') {
                if(!horaInicioSunset.includes(i.horaInicio)) horaInicioSunset.push(i.horaInicio);
                if(!horaFinSunset.includes(i.horaFin)) horaFinSunset.push(i.horaFin); 
              } else if(sala === 'future') {
                if(!horaInicioFuture.includes(i.horaInicio)) horaInicioFuture.push(i.horaInicio);
                if(!horaFinFuture.includes(i.horaFin)) horaFinFuture.push(i.horaFin);
              } else if(sala === 'nature') {
                if(!horaInicioNature.includes(i.horaInicio)) horaInicioNature.push(i.horaInicio);
                if(!horaFinNature.includes(i.horaFin)) horaFinNature.push(i.horaFin);
              } 
            })
            //ordenar horarios de menor a mayor
            if(sala === 'sunset') {
              ordenacionBurbuja(horaInicioSunset);
              ordenacionBurbuja(horaFinSunset);
            } else if(sala === 'future') {
              ordenacionBurbuja(horaInicioFuture);
              ordenacionBurbuja(horaFinFuture);
            }  else if(sala === 'nature') {
              ordenacionBurbuja(horaInicioNature);
              ordenacionBurbuja(horaFinNature);
            }  
        })  
    }
    await dbCall();
} 

//obtiene horarios para actualizar las reservaciones de la sala sunset, funciona cada 10 min. 
cron.schedule('* * * * *', () => { 
  console.log("No. 1", sd.format(new Date(), "HH:mm"));
  var i = 0; 
  ordenarHorarios( 'sunset' );
  //hora inicial de reservacion
  var minutosInicio = parseInt(horaInicioSunset[i].substr(3, 5));
  var horaInicio = parseInt(horaInicioSunset[i].substr(0, 2));

  //hora final de reservacion
  var minutosFinal = parseInt(horaFinSunset[i].substr(3, 5));
  var horaFinal = parseInt(horaFinSunset[i].substr(0, 2));

  console.log('Sunset ', horaInicioSunset, horaFinSunset, horaInicioSunset[i], horaFinSunset[i]);
 
  //marcar la resrvacion en uso
  cron.schedule(`${minutosInicio} ${horaInicio} ${diaActual} * *`, async () => {
    const dbCall = () => {
      try {
        bd.query(
          "UPDATE reservaciones SET estado = ? WHERE horaInicio = ?",
          ["En uso", horaInicioSunset[i]],
          (err, data) => {
            if (err) throw err; 
            console.log("sunset actualizado con exito"); 
          }
        );
      } catch (error) {
        console.log(error);
      }
    };
    await dbCall();
  });

  //marcar la reservacion como finalizada
  cron.schedule(`${minutosFinal} ${horaFinal} ${diaActual} * *`, async () => {
    const dbCall = () => { 
      try {
        bd.query(
          "UPDATE reservaciones SET estado = ? WHERE horaInicio = ?",
          ["finalizada", horaInicioSunset[i]],
          (err, data) => {
            if (err) throw err;
            //retira las reservaciones finalizadas de la cola de horarios
            horaFinSunset.shift();
            horaInicioSunset.shift(); 
            console.log( "actualizado con exito", horaFinSunset, horaInicioSunset );
          }
        );
      } catch (error) {
        console.log(error);
      }
    };
    await dbCall();
  });
  
}); 

//obtiene horarios para actualizar las reservaciones de la sala future, funciona cada 10 min. 
cron.schedule('* * * * *', () => { 
  console.log("No. 2", sd.format(new Date(), "HH:mm"));
  var i = 0; 
  ordenarHorarios( 'future' );

  //hora inicial de reservacion
  var minutosInicio = parseInt(horaInicioFuture[i].substr(3, 5));
  var horaInicio = parseInt(horaInicioFuture[i].substr(0, 2));

  //hora final de reservacion
  var minutosFinal = parseInt(horaFinFuture[i].substr(3, 5));
  var horaFinal = parseInt(horaFinFuture[i].substr(0, 2));

  console.log('future ', horaInicioFuture, horaFinFuture, horaInicioFuture[i], horaFinFuture[i]);
 
  //marcar la resrvacion en uso
  cron.schedule(`${minutosInicio} ${horaInicio} ${diaActual} * *`, async () => {
    const dbCall = () => {
      try {
        bd.query(
          "UPDATE reservaciones SET estado = ? WHERE horaInicio = ?",
          ["En uso", horaInicioFuture[i]],
          (err, data) => {
            if (err) throw err; 
            console.log("actualizado con exito"); 
          }
        );
      } catch (error) {
        console.log(error);
      }
    };
    await dbCall();
  });

  //marcar la reservacion como finalizada
  cron.schedule(`${minutosFinal} ${horaFinal} ${diaActual} * *`, async () => {
    const dbCall = () => { 
      try {
        bd.query(
          "UPDATE reservaciones SET estado = ? WHERE horaInicio = ?",
          ["finalizada", horaInicioFuture[i]],
          (err, data) => {
            if (err) throw err;
            //retira las reservaciones finalizadas de la cola de horarios
            horaFinFuture.shift();
            horaInicioFuture.shift(); 
            console.log( "actualizado con exito", horaFinFuture, horaInicioFuture );
          }
        );
      } catch (error) {
        console.log(error);
      }
    };
    await dbCall();
  });
  
}); 

//obtiene horarios para actualizar las reservaciones de la sala nature, funciona cada 10 min. 
cron.schedule('* * * * *', () => { 
  console.log("No. 3", sd.format(new Date(), "HH:mm"));
  var i = 0; 
  ordenarHorarios( 'nature' );

  //hora inicial de reservacion
  var minutosInicio = parseInt(horaInicioNature[i].substr(3, 5));
  var horaInicio = parseInt(horaInicioNature[i].substr(0, 2));

  //hora final de reservacion
  var minutosFinal = parseInt(horaFinNature[i].substr(3, 5));
  var horaFinal = parseInt(horaFinNature[i].substr(0, 2));

  console.log('nature', horaInicioNature, horaFinNature, horaInicioNature[i], horaFinNature[i]);
 
  //marcar la resrvacion en uso
  cron.schedule(`${minutosInicio} ${horaInicio} ${diaActual} * *`, async () => {
    const dbCall = () => {
      try {
        bd.query(
          "UPDATE reservaciones SET estado = ? WHERE horaInicio = ?",
          ["En uso", horaInicioNature[i]],
          (err, data) => {
            if (err) throw err; 
            console.log("actualizado con exito"); 
          }
        );
      } catch (error) {
        console.log(error);
      }
    };
    await dbCall();
  });

  //marcar la reservacion como finalizada
  cron.schedule(`${minutosFinal} ${horaFinal} ${diaActual} * *`, async () => {
    const dbCall = () => { 
      try {
        bd.query(
          "UPDATE reservaciones SET estado = ? WHERE horaInicio = ?",
          ["finalizada", horaInicioNature[i]],
          (err, data) => {
            if (err) throw err;
            //retira las reservaciones finalizadas de la cola de horarios
            horaFinNature.shift();
            horaInicioNature.shift(); 
            console.log( "actualizado con exito", horaFinNature, horaInicioNature );
          }
        );
      } catch (error) {
        console.log(error);
      }
    };
    await dbCall();
  });
  
}); 
     
console.log(sd.format(new Date(), 'HH:mm'))