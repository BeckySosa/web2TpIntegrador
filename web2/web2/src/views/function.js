document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modal-imagen');
    const closeModal = document.querySelector('.close-modal');
    const imageContainer = document.querySelector('.contenedor-imagenes-adicionales');

    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
        imageContainer.innerHTML = '';  
    });


    document.querySelectorAll('.ver-mas').forEach(button => {
        button.addEventListener('click', async function(event) {
            event.preventDefault(); 
            const objectId = this.getAttribute('data-object-id');
            
            try {
                const response = await fetch(`/object/${objectId}/additional-images`);
                const additionalImages = await response.json();

                imageContainer.innerHTML = '';  


                additionalImages.forEach(imageUrl => {
                    const imgElement = document.createElement('img');
                    imgElement.src = imageUrl;
                    imgElement.alt = "Imagen adicional";

                    imgElement.onerror = () => {
                        imgElement.style.display = 'none';  
                    };


                    imageContainer.appendChild(imgElement);
                });

                modal.style.display = 'block'; 
            } catch (error) {
                console.error('Error al cargar las imágenes adicionales:', error);
            }
        });
    });
});