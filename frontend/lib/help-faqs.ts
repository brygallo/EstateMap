/**
 * Preguntas frecuentes de la página de ayuda. Viven aquí (y no dentro del
 * componente cliente) para que el layout servidor pueda emitir el mismo
 * contenido como JSON-LD FAQPage sin duplicar los textos.
 */
export const HELP_FAQS = [
  { q: '¿Tiene algún costo publicar?', a: 'No. Publicar es 100% gratis y no cobramos comisión por las ventas ni los arriendos. El contacto entre anunciante e interesado es directo.' },
  { q: '¿Necesito crear una cuenta antes de empezar?', a: 'No. Puedes ubicar tu propiedad y llenar el formulario sin cuenta. Solo te pedimos registrarte al momento de publicar, y el borrador se guarda mientras tanto.' },
  { q: '¿Cuántas propiedades puedo publicar?', a: 'Las que necesites. No hay un límite de publicaciones por cuenta.' },
  { q: '¿Necesito conocimientos técnicos?', a: 'No. Si alguna vez usaste un mapa en línea, puedes ubicar tu propiedad y completar el formulario sin problema.' },
  { q: '¿Qué pasa con mis fotos?', a: 'Se optimizan automáticamente para cargar rápido manteniendo buena calidad. Puedes subir hasta 10 por propiedad y reordenarlas para elegir la portada.' },
  { q: '¿Puedo editar o eliminar una propiedad?', a: 'Sí. Desde “Mis propiedades” puedes editar los datos, cambiar fotos, marcarla como inactiva o eliminarla cuando quieras.' },
  { q: '¿Cómo me contactan los interesados?', a: 'La ficha muestra tu teléfono. Los interesados te llaman o te escriben por WhatsApp directamente, sin intermediarios.' },
  { q: '¿Funciona en todo Ecuador?', a: 'Sí. Puedes registrar propiedades en cualquier provincia y ciudad del país.' },
  { q: '¿Puedo compartir solo algunas propiedades?', a: 'Sí. Aplica filtros en el mapa y comparte el enlace: mostrará únicamente las propiedades que cumplan esos filtros.' },
];
