require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

const app = express();
//servidor para iniciarlizar con express

const PORT = process.env.PORT || 3000;

//para poder aplicar el MVC necesitamos un intermediario que se va a encargar de ser un mesero (middleware), el cual para cada peticion que pasa por la ruta de la vista, obtiene una petición y la envia a un controlador

//como el frontend y el backend se sirven desde el mismo origen, habilitamos
//cors con credenciales para que la cookie de sesion viaje en cada peticion
app.use(cors({ origin: true, credentials: true }));

//las peticiones las debemos de atender en un formato JSON, lo que permite poder detectar los elementos bajo los criterios clave, valor

app.use(express.json());

//configuramos la sesion del lado del servidor: al iniciar sesion guardamos el
//usuarioId en req.session y cada peticion posterior lo recibe por medio de la
//cookie firmada, lo que permite separar los datos por cuenta
app.use(session({
    secret: process.env.SESSION_SECRET || 'administratech-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 dia
    }
}));

//que se debe de tener una ruta personalizada por cada tipo de petición next es la ruta a la cual se va atender el tipo de petión o de respuesta

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

//debemos definir las rutas para los archivos estáticos del proyecto
app.use(express.static(path.join(__dirname)));

//vamos a manejar las rutas de los recursos que se van a obtener por medio de las peticiones o respuestas
//pueden existen rutas como app.use('api/usuarios', usuariosRouter) todas las rutas son los metodos posibles para cada formulario
//router.get('/')
//router.get('/usuarios')
//router.post('/')
//router.get('/:id')
// 1. Importas tu nuevo archivo de rutas (ponlo arriba con tus otros requires)
const inicioSesionRouter = require('./SRC/Routers/Inicio_sesion');
const usuariosRouter = require('./SRC/Routers/usuarios');
const productosRouter = require('./SRC/Routers/productos');
const ventasRouter = require('./SRC/Routers/ventas');
const categoriasRouter = require('./SRC/Routers/categorias');
const marcasRouter = require('./SRC/Routers/marcas');

// 2. Lo registras en Express (ponlo junto a tus otras APIs de la línea 41-45)
app.use('/api/auth', inicioSesionRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/productos', productosRouter);
app.use('/api/ventas', ventasRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/marcas', marcasRouter);




//vamos a documentar cada endpoint
app.get('/api', (req, res) => {
    res.json({
        status : 'success',
        message : 'API REST ',
        endpoint : {
            auth: {
                login: 'POST /api/auth/login',
                crear: 'POST /api/auth/crear'
            }
            
            
            

        }
    });
});

//vamos a crear una funcion para las rutas inexistentes
app.use('/api/*path', (req, res) => {
    res.status(404).json({
        status : 'error',
        message : 'Ruta no encontrada'
    });
});

//necesitamos un manejador de errores
app.use((err, req, res, next) =>{
    console.log('error no manejado: ', err.message);
    res.status(500).json({
        status : 'error',
        message : 'Error interno del servidor'
    });
});

app.listen(PORT, () => {
    console.log('Servidor inicializado');
});