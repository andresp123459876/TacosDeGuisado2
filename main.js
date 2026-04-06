const botonMenu = document.querySelector(".abrir-sidebar");
const sidebar = document.querySelector(".header-all-sidebar");
const botonCancelarMenu = document.querySelector(".cerrar-sidebar") 

botonMenu.addEventListener("click",abrirSideBar);
botonCancelarMenu.addEventListener("click",cerrarSideBar);

function abrirSideBar(){
    //  sidebar.style.visibility = "visible";
    sidebar.classList.add("active")
}

function cerrarSideBar(){
    // sidebar.style.visibility = "hidden";
    sidebar.classList.remove("active")
}

document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.header-all-sidebar');
    const botonAbrir = document.querySelector('.abrir-sidebar');

    // Si el sidebar tiene la clase que lo muestra (ajusta el nombre si usas otro)
    // Y el clic NO fue dentro del sidebar
    // Y el clic NO fue en el botón de abrir
    if (sidebar.classList.contains('active') && 
        !sidebar.contains(event.target) && 
        !botonAbrir.contains(event.target)) {
        
        cerrarSideBar();
    }
});

//----------------
function mostrarImagen(elemento) {
    const modal = document.getElementById("tacoModal");
    const imgGrande = document.getElementById("imgGrande");
    
    modal.style.display = "flex"; // Muestra el modal
    imgGrande.src = elemento.src; // Copia la ruta de la imagen pequeña a la grande
}

function cerrarImagen() {
    document.getElementById("tacoModal").style.display = "none"; /*quita la imagen grande */
}

/*----------------------*/
// Selecciona todos los enlaces que tengan un hash (#)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault(); // Evita el salto brusco

        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            // Calculamos la posición restando la altura de tu header (aprox 80px)
            const offset = 150; 
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth' // Aquí ocurre la animación
            });
        }
    });
});

