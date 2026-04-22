import express from 'express';
import path from 'path';
import bcrypt from 'bcrypt';
import session from 'express-session';
import flash from 'express-flash';
import passport from 'passport';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { pool } from './config/dbConfig.js';
import { initialize } from './passportConfig.js';

/*cambios para vercel */
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ahora ya puedes usar __dirname en el resto de tu código

const app = express();
//neon-vercel le da confianza al uso de coockies
app.set('trust proxy', 1);

initialize(passport);

// ─── Seguridad: headers HTTP ──────────────────────────────────────────────────
// helmet agrega headers como X-Frame-Options, X-Content-Type-Options, etc.
// Protege contra clickjacking, XSS, y otros ataques comunes de browser.
app.use(helmet({
    contentSecurityPolicy: false // desactivado para no romper CDN de estilos
}));

// ─── Rate limiting en login ───────────────────────────────────────────────────
// Máximo 10 intentos de login por IP cada 15 minutos.
// Previene ataques de fuerza bruta para adivinar contraseñas.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

// ─── Configuración del motor de vistas ───────────────────────────────────────
app.set('view engine', 'ejs');

// ─── Middlewares ──────────────────────────────────────────────────────────────
// Límite de 10kb previene ataques DoS con payloads enormes
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

// ─── Sesiones ─────────────────────────────────────────────────────────────────
// SESSION_SECRET viene del .env — nunca hardcodeado.
// Si no existe la variable, el servidor NO arranca para evitar un secreto vacío.
if (!process.env.SESSION_SECRET) {
    console.error('ERROR: SESSION_SECRET no está definido en .env');
    process.exit(1);
}

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        proxy:true, //se anade para vercel
        cookie: {
            httpOnly: true,   // la cookie no es accesible desde JavaScript del browser
            // secure: process.env.NODE_ENV === 'production', // solo HTTPS en producción
            secure:true,
            sameSite:'none',
            maxAge: 1000 * 60 * 60 * 2 // sesión expira en 2 horas
        }
    })
);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
/*editado para verrcel*/ 
// app.use(express.static(path.join('public')));
app.use(express.static(path.join(__dirname, 'public')));

// ─── RUTAS PÚBLICAS ───────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    const listaTacos = [
        { nombre: 'Carnita con Nopales', imagen: 'TacoDeCarnitaConNopales(NegraComic).jpg' },
        { nombre: 'Chicharrón Prensado', imagen: 'TacoDeChicharronPrensado(NegraComic).jpg' },
        { nombre: 'Milanesa de Pollo', imagen: 'TacoDeMilanesa(NaranjaComic).jpg' },
        { nombre: 'Mole con Huevo', imagen: 'TacoDeMoleConHuevoDuro(NegraComic).jpg' },
        { nombre: 'Carnita en Chile Morita', imagen: 'TacoDeMorita(NaranjaComic).jpg' },
        { nombre: 'Salpicon/Aporreadillo', imagen: 'TacoDeSalpicon(NaranjaComic).jpg' },
    ];

    const imagenesCarrusel = [
        { url: 'TacoDeGuisadoLogo.jpg', alt: 'Logo Principal' },
        { url: 'Promocion3TacosDeGuisadox110.jpg', alt: 'Promoción 3x110' },
        { url: 'JuevesDePozoleEstiloGuerrero12a6pm.png', alt: 'Jueves de Pozole' },
    ];

    res.render('index.ejs', { tacos: listaTacos, slides: imagenesCarrusel });
});

app.get('/menu', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM platillos ORDER BY id ASC');
        res.render('menuTacos.ejs', { platillos: resultado.rows });
    } catch (err) {
        console.error('Error al obtener platillos:', err);
        res.status(500).send('Error al cargar el menú');
    }
});

app.get('/menuBebidas', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM bebidas ORDER BY id ASC');
        res.render('menu-bebidas.ejs', { bebidas: resultado.rows });
    } catch (err) {
        console.error('Error al obtener bebidas:', err);
        res.status(500).send('Error al cargar el menú de bebidas');
    }
});

// ─── AUTENTICACIÓN ────────────────────────────────────────────────────────────

app.get('/user/login', checkAuthenticated, (req, res) => {
    res.render('login.ejs');
});

// loginLimiter aplicado aquí — máximo 10 intentos por IP cada 15 min
app.post('/user/login', loginLimiter, passport.authenticate('local', {
    successRedirect: '/user/admin',
    failureRedirect: '/user/login',
    failureFlash: true
}));

app.get('/user/logout', (req, res, next) => {
    req.logOut(function (err) {
        if (err) return next(err);
        req.flash('success_msg', 'Sesión cerrada correctamente');
        res.redirect('/user/login');
    });
});

// ─── REGISTRO ─────────────────────────────────────────────────────────────────
// Nota: la ruta /user/register está oculta en el login (visibility: hidden)
// Si no quieres que nadie más se registre, puedes eliminar estas dos rutas.

// app.get('/user/register', checkAuthenticated, (req, res) => {
//     res.render('Register.ejs');
// });

// app.post('/user/register', async (req, res) => {
//     let { name, email, password, password2 } = req.body;

//     // CORRECCIÓN: se eliminó console.log con contraseña en texto plano
//     let errors = [];

//     if (!name || !email || !password || !password2) {
//         errors.push({ message: 'Por favor llena todos los campos' });
//     }

//     if (password && password.length < 6) {
//         errors.push({ message: 'La contraseña debe tener al menos 6 caracteres' });
//     }

//     if (password !== password2) {
//         errors.push({ message: 'Las contraseñas no coinciden' });
//     }

//     if (errors.length > 0) {
//         return res.render('Register.ejs', { errors });
//     }

//     try {
//         const hashedPassword = await bcrypt.hash(password, 10);

//         // CORRECCIÓN: se cambió 'picina' por 'pool' (era un ReferenceError)
//         const existingUser = await pool.query(
//             'SELECT * FROM users WHERE email = $1',
//             [email]
//         );

//         if (existingUser.rows.length > 0) {
//             errors.push({ message: 'El correo ya está registrado' });
//             return res.render('Register.ejs', { errors });
//         }

//         await pool.query(
//             'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
//             [name, email, hashedPassword]
//         );

//         req.flash('success_msg', 'Registro exitoso. Por favor inicia sesión');
//         res.redirect('/user/login');

//     } catch (err) {
//         // CORRECCIÓN: en vez de 'throw err' (que crashea el server), se maneja el error
//         console.error('Error en registro:', err);
//         res.status(500).send('Error interno del servidor');
//     }
// });

// ─── PANEL ADMIN Tacos──────────────────────────────────────────────────────────────

app.get('/user/admin', checkNotAuthenticated, async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM platillos ORDER BY id ASC');
        res.render('Admin.ejs', {
            user: req.user.nombre,
            platillos: resultado.rows
        });
    } catch (err) {
        console.error('Error al obtener platillos:', err);
        res.status(500).send('Error al cargar el panel de administración');
    }
});

app.post('/user/admin/agregar', checkNotAuthenticated, async (req, res) => {
    const { nombre, descripcion, precio } = req.body;

    // MEJORA: validación del precio en el servidor
    const precioNum = parseFloat(precio);
    if (!nombre || !descripcion || isNaN(precioNum) || precioNum < 0 || precioNum > 99999) {
        return res.status(400).send('Datos inválidos');
    }

    try {
        await pool.query(
            'INSERT INTO platillos (nombre, descripcion, precio) VALUES ($1, $2, $3)',
            [nombre.trim(), descripcion.trim(), precioNum]
        );
        res.redirect('/user/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al agregar el platillo');
    }
});

app.post('/user/admin/eliminar', checkNotAuthenticated, async (req, res) => {
    const { id } = req.body;

    // MEJORA: validar que el id sea un número entero
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).send('ID inválido');
    }

    try {
        await pool.query('DELETE FROM platillos WHERE id = $1', [parseInt(id)]);
        res.redirect('/user/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al eliminar el platillo');
    }
});

app.get('/user/admin/editar/:id', checkNotAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) return res.status(400).send('ID inválido');

    try {
        const resultado = await pool.query('SELECT * FROM platillos WHERE id = $1', [id]);
        if (resultado.rows.length === 0) return res.status(404).send('Platillo no encontrado');

        // CORRECCIÓN: se cambió req.user.name por req.user.nombre (consistente con el resto)
        res.render('Editar.ejs', { user: req.user.nombre, platillo: resultado.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar el platillo');
    }
});

app.post('/user/admin/actualizar/:id', checkNotAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const { nombre, descripcion, precio } = req.body;

    const precioNum = parseFloat(precio);
    if (isNaN(id) || !nombre || !descripcion || isNaN(precioNum) || precioNum < 0) {
        return res.status(400).send('Datos inválidos');
    }

    try {
        await pool.query(
            'UPDATE platillos SET nombre = $1, descripcion = $2, precio = $3 WHERE id = $4',
            [nombre.trim(), descripcion.trim(), precioNum, id]
        );
        res.redirect('/user/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar el platillo');
    }
});

// ─── PANEL ADMIN BEBIDAS──────────────────────────────────────────────────────────────

app.get('/user/admin-bebidas', checkNotAuthenticated, async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM bebidas ORDER BY id ASC');
        res.render('AdminBebidas.ejs', {
            user: req.user.nombre,
            bebidas: resultado.rows
        });
    } catch (err) {
        console.error('Error al obtener bebidas:', err);
        res.status(500).send('Error al cargar el panel de administración');
    }
});

app.post('/user/admin/agregar-bebida', checkNotAuthenticated, async (req, res) => {
    const { nombre, precio } = req.body;

    // MEJORA: validación del precio en el servidor
    const precioNum = parseFloat(precio);
    if (!nombre || isNaN(precioNum) || precioNum < 0 || precioNum > 99999) {
        return res.status(400).send('Datos inválidos');
    }

    try {
        await pool.query(
            'INSERT INTO bebidas (nombre, precio) VALUES ($1, $2)',
            [nombre.trim(), precioNum]
        );
        res.redirect('/user/admin-bebidas');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al agregar el platillo');
    }
});

app.post('/user/admin/eliminar-bebida', checkNotAuthenticated, async (req, res) => {
    const { id } = req.body;

    // MEJORA: validar que el id sea un número entero
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).send('ID inválido');
    }

    try {
        await pool.query('DELETE FROM bebidas WHERE id = $1', [parseInt(id)]);
        res.redirect('/user/admin-bebidas');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al eliminar el la bebida');
    }
});

app.get('/user/admin/editar-bebida/:id', checkNotAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) return res.status(400).send('ID inválido');

    try {
        const resultado = await pool.query('SELECT * FROM bebidas WHERE id = $1', [id]);
        if (resultado.rows.length === 0) return res.status(404).send('Platillo no encontrado');

        // CORRECCIÓN: se cambió req.user.name por req.user.nombre (consistente con el resto)
        res.render('EditarBebidas.ejs', { user: req.user.nombre, bebida: resultado.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar el platillo');
    }
});

app.post('/user/admin/actualizar-bebida/:id', checkNotAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const { nombre, precio } = req.body;

    const precioNum = parseFloat(precio);
    if (isNaN(id) || !nombre || isNaN(precioNum) || precioNum < 0) {
        return res.status(400).send('Datos inválidos');
    }

    try {
        await pool.query(
            'UPDATE bebidas SET nombre = $1, precio = $2 WHERE id = $3',
            [nombre.trim(), precioNum, id]
        );
        res.redirect('/user/admin-bebidas');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar el platillo');
    }
});

// ─── MIDDLEWARES DE AUTENTICACIÓN ─────────────────────────────────────────────

// Si ya está autenticado, lo manda al admin (evita ver login de nuevo)
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return res.redirect('/user/admin');
    next();
}

// Si NO está autenticado, lo manda al login
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/user/login');
}

// ─── SERVIDOR ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
