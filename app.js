//https://www.youtube.com/watch?v=vxu1RrR0vbw
//1:20:09
import express from 'express'
import pg, { Pool } from 'pg'
import bodyParser from 'body-parser'

import path from "path";

const app = express();
import { pool } from './config/dbConfig.js';
import bcrypt from 'bcrypt';
import session from 'express-session';//Permite que la aplicación mantenga el estado de un usuario a lo largo de varias interacciones
import flash from 'express-flash';// Es una forma conveniente de enviar mensajes temporales de una página a otra, lo que es muy útil para notificaciones de usuario.
import { error } from 'console';
import { setServers } from 'dns';
import passport from 'passport';
const { authenticate } = passport;
//import passport, { authenticate } from 'passport';
//const initializePassport = require("./passportConfig.js"); //codigo CommonJS
import { initialize } from './passportConfig.js';


initialize(passport);// La lógica de configuración de la autenticación se mantiene en un archivo, y esta única línea se encarga de aplicar toda esa configuración.

//set templating engine as ejs
app.set('view-engine', 'ejs');
app.use(express.urlencoded({ extended: false })); //codigo para poder recibir y procesar informacion de formularios

app.use(
    session({
        secret: "secret",//Este es un secreto que se usa para firmar el ID de la sesión

        resave: false,//Esta opción evita que la sesión se vuelva a guardar en el almacén de sesiones

        saveUninitialized: false //el servidor solo guardará las sesiones que realmente tengan datos
    })
);

// la primera inicia el proceso de autenticación y la segunda mantiene al usuario autenticado a través de la sesión, lo que es esencial para cualquier aplicación con funcionalidad de inicio de sesión.
app.use(passport.initialize());//Passport se prepara para manejar las solicitudes de autenticación en cada petición que llega al servidor. Por ejemplo, en esta etapa, Passport analiza las credenciales enviadas por el usuario.
app.use(passport.session());//Le dice a Passport que use el sistema de sesiones de Express para almacenar la información de los usuarios que han iniciado sesión. Después de que un usuario se autentica con éxito, Passport guarda su información (normalmente solo el ID del usuario) en la sesión, lo que le permite recordar que el usuario ya inició sesión sin tener que pedirle sus credenciales en cada solicitud.

app.use(flash());// habilita el uso de mensajes "flash" en la aplicación Express

//add carpet 'public' to use css in ejs
app.use(express.static(path.join("public")));



//index 
app.get('/', (req, res) => {
    const listaTacos = [
        { nombre: 'Carnita con Nopales', imagen: 'TacoDeCarnitaConNopales(NegraComic).jpg' },
        { nombre: 'Chicharrón Prensado', imagen: 'TacoDeChicharronPrensado(NegraComic).jpg' },
        { nombre: 'Milanesa de Pollo', imagen: 'TacoDeMilanesa(NaranjaComic).jpg' },
        { nombre: 'Mole con Huevo', imagen: 'TacoDeMoleConHuevoDuro(NegraComic).jpg' },
        { nombre: 'Carnita en Chile Morita', imagen: 'TacoDeMorita(NaranjaComic).jpg' },
        {nombre: 'Salpicon/Aporreadillo', imagen: 'TacoDeSalpicon(NaranjaComic).jpg'},

        // ... agrega los demás aquí
    ];

    const imagenesCarrusel = [
        { url: 'TacoDeGuisadoLogo.jpg', alt: 'Logo Principal' },
        { url: 'Promocion3TacosDeGuisadox110.jpg', alt: 'Promoción 3x110' },
        { url: 'JuevesDePozoleEstiloGuerrero12a6pm.png', alt: 'Jueves de Pozole' },
    ];

    res.render('index.ejs', {
        tacos: listaTacos,
        slides: imagenesCarrusel
    });
});

app.get('/menu', async (req, res) => {
    try {
        // Consultamos los platillos de la tabla en Postgres
        // Importante: Asegúrate de que tu tabla en Postgres se llame "platillos"
        const resultado = await pool.query('SELECT * FROM platillos ORDER BY id ASC');

        // Enviamos 'user' para el saludo y 'platillos' para la lista
        res.render('menuTacos.ejs', {
            platillos: resultado.rows
        });
    } catch (err) {
        console.error("Error al obtener platillos:", err);
        res.status(500).send("Error al cargar el panel de administración");
    }
    // res.render('menuTacos.ejs');
});

app.get('/menuBebidas', async (req, res) => {
    try {
        // Consultamos los platillos de la tabla en Postgres
        // Importante: Asegúrate de que tu tabla en Postgres se llame "platillos"
        const resultado = await pool.query('SELECT * FROM bebidas ORDER BY id ASC');

        // Enviamos 'platillos' para la lista
        res.render('menu-bebidas.ejs', {
            bebidas: resultado.rows
        });
    } catch (err) {
        console.error("Error al obtener platillos:", err);
        res.status(500).send("Error al cargar el panel de administración");
    }
    // res.render('menuTacos.ejs');
});

app.get('/user/login', checkAuthenticated, (req, res) => {
    res.render('login.ejs')
})

app.get('/user/register', checkAuthenticated, (req, res) => {
    res.render('Register.ejs')
})

// Reemplaza tu ruta de dashboard actual por esta:
app.get('/user/admin', checkNotAuthenticated, async (req, res) => {
    try {
        // Consultamos los platillos de la tabla en Postgres
        // Importante: Asegúrate de que tu tabla en Postgres se llame "platillos"
        const resultado = await pool.query('SELECT * FROM platillos ORDER BY id ASC');

        // Enviamos 'user' para el saludo y 'platillos' para la lista
        res.render('Admin.ejs', {
            user: req.user.nombre,
            platillos: resultado.rows
        });
    } catch (err) {
        console.error("Error al obtener platillos:", err);
        res.status(500).send("Error al cargar el panel de administración");
    }
});

// RUTA PARA AGREGAR PLATILLO
app.post('/user/admin/agregar', checkNotAuthenticated, async (req, res) => {
    const { nombre, descripcion, precio } = req.body;
    try {
        await pool.query(
            'INSERT INTO platillos (nombre, descripcion, precio) VALUES ($1, $2, $3)',
            [nombre, descripcion, precio]
        );
        res.redirect('/user/admin'); // Recarga la página para ver el cambio
    } catch (err) {
        console.error(err);
        res.send("Error al agregar el platillo");
    }
});

// RUTA PARA ELIMINAR PLATILLO
app.post('/user/admin/eliminar', checkNotAuthenticated, async (req, res) => {
    const { id } = req.body;
    try {
        await pool.query('DELETE FROM platillos WHERE id = $1', [id]);
        res.redirect('/user/admin'); // Recarga la página para ver que ya no está
    } catch (err) {
        console.error(err);
        res.send("Error al eliminar el platillo");
    }
});

// A. RUTA PARA MOSTRAR EL FORMULARIO DE EDICIÓN
app.get('/user/admin/editar/:id', checkNotAuthenticated, async (req, res) => {
    const id = req.params.id;
    try {
        const resultado = await pool.query('SELECT * FROM platillos WHERE id = $1', [id]);
        const platillo = resultado.rows[0];

        // Renderizamos una nueva vista llamada "Editar.ejs"
        res.render('Editar.ejs', { user: req.user.name, platillo: platillo });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al cargar el platillo");
    }
});

// B. RUTA PARA PROCESAR LA ACTUALIZACIÓN
app.post('/user/admin/actualizar/:id', checkNotAuthenticated, async (req, res) => {
    const id = req.params.id;
    const { nombre, descripcion, precio } = req.body;
    try {
        await pool.query(
            'UPDATE platillos SET nombre = $1, descripcion = $2, precio = $3 WHERE id = $4',
            [nombre, descripcion, precio, id]
        );
        res.redirect('/user/admin');
    } catch (err) {
        console.error(err);
        res.send("Error al actualizar");
    }
});
//---------------
app.get('/user/logout', (req, res, next) => {
    req.logOut(function (err) {
        if (err) {
            return next(err);
        }

        req.flash("success_msg", "you have logged out");
        res.redirect('/user/login');

    });
})

app.post('/user/register', async (req, res) => {
    let { name, email, password, password2 } = req.body;
    console.log({
        name,
        email,
        password,
        password2
    });

    let errors = [];

    if (!name || !email || !password || !password2) {
        errors.push({ message: "Please enter all fields" });
    }

    if (password.length < 6) {
        errors.push({ message: "Password should be at least 6 characters" });
    }

    if (password != password2) {
        errors.push({ message: "Passwords do not match" });
    }

    if (errors.length > 0) {
        res.render('Register.ejs', { errors });
    } else {
        //Form validation has passed
        let hashedPassword = await bcrypt.hash(password, 10); //crea variable hashedPassword y espera con "wait" a que termine de encriptar la contrasena
        console.log(hashedPassword);

        picina.query( //abre conexion con la base de datos y ordena realizar una query
            `SELECT * FROM users
            WHERE email = $1`,
            [email], //parametro en $1
            (err, results) => { //funcion con parametros de error y resultados
                if (err) {
                    throw err;
                }
                console.log("reaches here");
                console.log(results.rows) //imprime en consola los resultados de la query

                if (results.rows.length > 0) {
                    errors.push({ message: "Email already registered" });
                    res.render('Register.ejs', { errors });
                } else {
                    picina.query(
                        `INSERT INTO users (name, email, password)
                        VALUES ($1, $2, $3)
                        RETURNING id, password`, [name, email, hashedPassword],
                        (err, results) => {
                            if (err) {
                                throw err;
                            }
                            console.log(results.rows);
                            req.flash("success_msg", "you are now registered. Please log in");  //crea un mensaje temporal que se mostrara en la pagina rederigida, variable=success_msg , valor de variable="you are now registered..."  
                            res.redirect('/user/login');
                        }
                    )
                }

            }
        )
    }
});

//"POST" se usa para enviar datos de un formulario
app.post('/user/login', passport.authenticate('local', { //es un middleware de Passport que se encarga de la autenticacion, "local" = le indica a Passport que use la estrategia de autenticacion local ya se configura.Esta estrategia maneja la verificación de credenciales con un email y una contraseña.
    successRedirect: 'admin', //si la autenticacion es exitosa redirecciona a dashboard
    failureRedirect: 'login',// si la autenticacion falla redireccion a login
    failureFlash: true//habilita los mensajes flash para los fallos

}))

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/user/admin');
    }
    next();
}

//si el usuario esta autenticado continua la siguiente funcion, si no redirecciona al login 
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/user/login');
}

//correr servidor - npm run dev - npm start
// Server 
app.listen(3000, function () {
    console.log('sever started on port 3000')
})

