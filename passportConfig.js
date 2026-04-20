//const LocalStrategy = require("passport-local").Strategy; //codigo viejo
import { Strategy as LocalStrategy } from 'passport-local';
import { pool } from './config/dbConfig.js'; //importamos objeto picina de archivo dbconfig
import bcrypt from 'bcrypt';

function initialize(passport) {
    const authenticateUser = (correo, password, done) => {
        pool.query(
            `SELECT * FROM admin WHERE correo = $1`,
            [correo],
            (err, results) => {
                if (err) {
                    throw err;
                }

                console.log(results.rows);

                if (results.rows.length > 0) {
                    const user = results.rows[0];

                    bcrypt.compare(password, user.password, (err, isMatch) => { //"bcrypt.compare" = compara la contrasena del formulario (password) con la contrasena hasheada en la base de datos (user.password)
                        if (err) {
                            throw err;
                        }

                        if (isMatch) {
                            return done(null, user);// "done" le devuelve el control a Passport, "null" le indica a Passport que no hubo ningun error, "user" es el objeto de usuario que se acaba de autenticar y Passport lo almacenara en la sesion del usuario
                        } else {
                            return done(null, false, { message: "Password is not correct" });// "null" = no hubo error en el servidor, "false" = la autenticacion del usuario fallo, manda el valor del objeto "message" "Password is ..."
                        }
                    });
                } else {
                    return done(null, false, { message: "Email is not registered" });
                }
            }
        );
    };

    passport.use(
        new LocalStrategy({ //crea un objeto de sesion: con los "name" del formulario
            usernameField: "correo", //cuando reciba los datos de un formulario de inicio de sesión, debe buscar el campo que se llama "email" para usarlo como el nombre de usuario.
            passwordField: "password" // cuando reciba los datos de un formulario de inicio de sesion, debe buscar el campo que se llama "password" 
        },
            authenticateUser  //Esta función es la que Passport llamará para verificar si el email y la contraseña que ingresó el usuario son correctos
        )
    );

    passport.serializeUser((user, done) => done(null, user.id));//este código asegura que la sesión del usuario sea lo más ligera y segura posible. Almacenar solo el ID es suficiente, ya que Passport puede usar ese ID para recuperar la información completa del usuario de la base de datos en las solicitudes futuras.
    //Este codigo recupera la información completa de un usuario de la base de datos usando solo su ID, y se la pasa a Passport para que esté disponible en la solicitud actual. Esto permite que en cualquier parte de tu aplicación puedas acceder a los datos del usuario autenticado, como req.user.
    passport.deserializeUser((id, done) => { //"id" el id que se almaceno previamente con "serializeUser" (linea:47) , "done" = devuelve el objeto de usuario a Passport
        pool.query(
            `SELECT * FROM admin WHERE id = $1`, [id], (err, results) => {
                if (err) {
                    return done(err);
                }
                return done(null, results.rows[0]);//si la consulta es exitosa la funcion done devuelve el objeto de usuario a Passport, "null" indica que no hubo errores, "results.rows[0]" es el objeto de la base de datos,"[0]" toma el primero en la consulta
            }
        )
    })
}

//module.export = initialize // codigo antigua CommonJS
export { initialize };
