//librerias descargadas
const express = require('express');
const mysql = require('mysql');
const app = express(); 
const cors = require('cors'); 

//configuraciones de puerto para express
app.set('port', process.env.PORT || 4000); 

app.listen(app.get('port'), () => {
    console.log(`Api iniciada, puerto:${app.get('port')}`);
}); 

