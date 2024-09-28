import express from "express";
import path from 'path';
import { fileURLToPath } from 'url';
import axios from "axios"
import translate from "node-google-translate-skidz"
import { error } from "console";

const app= express();
const PORT= 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'views')));
///solicitud asincrona
app.get("/",async (req,res)=>{
    try {
        const response = await axios.get('https://collectionapi.metmuseum.org/public/collection/v1/departments')
    const departments= response.data.departments
    const departmentsTraducidos=await Promise.all(departments.map(async (department)=>{
        try {
            const departmentTraducido=await traductor(department.displayName,"en","es")
            return {
                ...department,
                displayName:departmentTraducido
            }
        } catch (error) {
            console.Error("Error al traducir",error)
            return department
        }
    }))
    res.render("index",{ departmentsTraducidos })
    
    } catch (error) {
        console.Error("Error al traducir departamento",error)
        res.status(500).send("Error del servidor al conectarse")
    }
    

})

app.get('/search', async (req, res) => {
    try {
        const departmentId = req.query.departmentId || '';
        const keyword = req.query.keyword || '';
        const location = req.query.location || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 20; 
        const offset = (page - 1) * limit;

        let url = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true`;

        if (departmentId) {
            url += `&q=''departmentId=${departmentId}`;
        }
        if (keyword) {
            url += `&q=${keyword}`;
        }
        if (location) {
            url += `&q=''location=${location}`;
        }
        
        console.log("URL de la API:", url);

        const response = await axios.get(url);

        if (!response.data || !Array.isArray(response.data.objectIDs) || response.data.objectIDs.length === 0) {
            return res.render('results', {
                objects: [],
                page,
                totalPages: 0,
                message: 'No se encontraron resultados para los filtros aplicados.',
                departmentId,
                keyword,
                location
            });
        }

        let objectIDs = response.data.objectIDs;
        const validObjects = [];
        let currentIndex = offset;

        while (validObjects.length < limit && currentIndex < objectIDs.length) {
            const batchIDs = objectIDs.slice(currentIndex, currentIndex + limit * 2); 
            const promises = batchIDs.map(id => 
                axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
                    .catch(err => {
                        console.error(`Error al recuperar el objeto con ID ${id}:`, err.message);
                        return null; 
                    })
            );

            const objects = await Promise.all(promises);
            const filteredObjects = objects.filter(obj => obj !== null);
            const objtraducidos = await Promise.all(filteredObjects.map(async obj => {
                if (obj && obj.data) {
                    const {
                        title = "",
                        dynasty = "",
                        culture = "",
                        objectDate = "",
                        additionalImages = []
                    } = obj.data;
            
                    try {
                        const titletrad = title ? await traductor(title, "en", "es") : title;
                        const dynastrad = dynasty ? await traductor(dynasty, "en", "es") : dynasty;
                        const cultutrad = culture ? await traductor(culture, "en", "es") : culture;
                        const objdate = objectDate ? await traductor(objectDate, "en", "es") : objectDate;
            
                        return {
                            ...obj.data,
                            title: titletrad,
                            dynasty: dynastrad,
                            culture: cultutrad,
                            objectDate: objdate,
                            additionalImages
                        };
                    } catch (error) {
                        console.error("Error al traducir");
                        return obj.data;
                    }
                }
                return null;
            }));
            
            validObjects.push(...objtraducidos.filter(obj => obj !== null).slice(0, limit - validObjects.length));

            currentIndex += batchIDs.length;
        }

        const totalObjects = response.data.total || 0;
        const totalPages = Math.ceil(totalObjects / limit);

        res.render('results', {
            objects: validObjects,
            page,
            totalPages,
            departmentId,
            keyword,
            location
        });

    } catch (error) {
        console.error("Error en la consulta a la API:", error.message, error.stack);
        res.status(500).send(`Error al recuperar los objetos de arte: ${error.message}`);
    }
});
app.get('/object/:id/additional-images', async (req, res) => {
    try {
        const objectId = req.params.id;
        const response = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`);
        const object = response.data;

        if (object.additionalImages && object.additionalImages.length > 0) {
            res.json(object.additionalImages);
        } else {
            res.json([]);  // Si no hay imágenes adicionales, devolver un array vacío
        }
    } catch (error) {
        console.error('Error al recuperar imágenes adicionales:', error);
        res.status(500).send('Error al recuperar las imágenes adicionales.');
    }
});   

function traductor(txt,original,traducido){
    return new Promise((resolve,reject)=>{
        translate({
            text:txt,
            source:original,
            target:traducido
        },function(result){
            if (result && result.translation) {
                resolve(result.translation)
            } else {
                console.error("error al traducir")
                reject(new Error("Error al traducir"))
            }
            
        })
    })
}
app.listen(PORT, () => {
    console.log(`SErvidor corriendo en el ppuerto ${PORT}`)
})
