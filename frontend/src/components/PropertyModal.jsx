import { useState } from 'react';

const PropertyModal = ({ property, isOpen, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!isOpen || !property) return null;

  // Format area with 2 decimals
  const formatArea = (area) => {
    return area ? parseFloat(area).toFixed(2) : '0.00';
  };

  const getPropertyTypeLabel = (type) => {
    const labels = {
      house: 'Casa',
      land: 'Terreno',
      apartment: 'Apartamento',
      commercial: 'Comercial',
      other: 'Otro'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status) => {
    const labels = {
      for_sale: 'En Venta',
      for_rent: 'En Alquiler',
      sold: 'Vendido',
      rented: 'Alquilado',
      inactive: 'Inactivo'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      for_sale: 'bg-green-500',
      for_rent: 'bg-blue-500',
      sold: 'bg-gray-500',
      rented: 'bg-purple-500',
      inactive: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const images = property.images || [];
  const hasImages = images.length > 0;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      className="fixed top-16 right-2 sm:right-4 w-[calc(100%-1rem)] sm:w-full max-w-sm max-h-[calc(100vh-6rem)] animate-slideIn"
      style={{ zIndex: 1500 }}
    >
      {/* Panel Container */}
      <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200">
        <div>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all hover:scale-110"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(100vh-6rem)]">
            {/* Image Gallery Section */}
            {hasImages ? (
              <div className="relative h-48 bg-gray-900">
                <img
                  src={images[currentImageIndex].image}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />

                {/* Image Counter */}
                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {currentImageIndex + 1} / {images.length}
                </div>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg transition-all hover:scale-110"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg transition-all hover:scale-110"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Thumbnail Strip */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm">
                    {images.slice(0, 5).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentImageIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img.image} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {images.length > 5 && (
                      <div className="w-12 h-12 rounded-lg bg-black/70 flex items-center justify-center text-white text-xs font-bold">
                        +{images.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg className="h-16 w-16 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium">Sin imágenes</p>
                </div>
              </div>
            )}

            {/* Content Section */}
            <div className="p-3">
              {/* Header */}
              <div className="mb-3">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-lg font-bold text-gray-900 flex-1">
                    {property.title || 'Propiedad'}
                  </h2>
                  <span className={`${getStatusColor(property.status)} text-white text-xs px-2 py-1 rounded-full font-semibold ml-2 flex-shrink-0`}>
                    {getStatusLabel(property.status)}
                  </span>
                </div>

                {/* Owner info */}
                <div className="flex items-center gap-1.5 mb-2 bg-gray-50 p-2 rounded-lg">
                  <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <div className="text-[10px] text-gray-500 font-medium">Publicado por</div>
                    <div className="text-xs text-gray-900 font-bold">
                      {property.owner_username || `Usuario ${property.owner}`}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-green-600">
                    ${parseFloat(property.price).toLocaleString()}
                  </span>
                  {property.is_negotiable && (
                    <span className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                      Negociable
                    </span>
                  )}
                </div>

                {/* Location */}
                {(property.address || property.city) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>
                      {property.address && <span>{property.address}</span>}
                      {property.address && property.city && <span>, </span>}
                      {property.city && <span>{property.city}</span>}
                      {property.province && <span>, {property.province}</span>}
                    </span>
                  </div>
                )}
              </div>

              {/* Key Features Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 rounded-lg text-center">
                  <div className="text-lg mb-0.5">📐</div>
                  <div className="text-base font-bold text-gray-900">{formatArea(property.area)}</div>
                  <div className="text-[10px] text-gray-600 font-medium">m² Total</div>
                </div>

                {property.built_area && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-2 rounded-lg text-center">
                    <div className="text-lg mb-0.5">🏗️</div>
                    <div className="text-base font-bold text-gray-900">{formatArea(property.built_area)}</div>
                    <div className="text-[10px] text-gray-600 font-medium">m² Construidos</div>
                  </div>
                )}

                {property.rooms > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-2 rounded-lg text-center">
                    <div className="text-lg mb-0.5">🛏️</div>
                    <div className="text-base font-bold text-gray-900">{property.rooms}</div>
                    <div className="text-[10px] text-gray-600 font-medium">Habitaciones</div>
                  </div>
                )}

                {property.bathrooms > 0 && (
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-2 rounded-lg text-center">
                    <div className="text-lg mb-0.5">🚿</div>
                    <div className="text-base font-bold text-gray-900">{property.bathrooms}</div>
                    <div className="text-[10px] text-gray-600 font-medium">Baños</div>
                  </div>
                )}

                {property.parking_spaces > 0 && (
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-2 rounded-lg text-center">
                    <div className="text-lg mb-0.5">🚗</div>
                    <div className="text-base font-bold text-gray-900">{property.parking_spaces}</div>
                    <div className="text-[10px] text-gray-600 font-medium">Estacionamientos</div>
                  </div>
                )}

                {property.floors && (
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-2 rounded-lg text-center">
                    <div className="text-lg mb-0.5">🏢</div>
                    <div className="text-base font-bold text-gray-900">{property.floors}</div>
                    <div className="text-[10px] text-gray-600 font-medium">{property.floors === 1 ? 'Piso' : 'Pisos'}</div>
                  </div>
                )}
              </div>

              {/* Description */}
              {property.description && (
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Descripción
                  </h3>
                  <p className="text-xs text-gray-700 leading-relaxed">{property.description}</p>
                </div>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <div className="text-[10px] font-semibold text-gray-500 mb-0.5">Tipo</div>
                  <div className="text-xs font-bold text-gray-900">{getPropertyTypeLabel(property.property_type)}</div>
                </div>

                {property.year_built && (
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <div className="text-[10px] font-semibold text-gray-500 mb-0.5">Año</div>
                    <div className="text-xs font-bold text-gray-900">{property.year_built}</div>
                  </div>
                )}

                {property.furnished && (
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <div className="text-[10px] font-semibold text-gray-500 mb-0.5">Amoblado</div>
                    <div className="text-xs font-bold text-green-600">Sí</div>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              {property.contact_phone && (
                <div className="bg-gradient-to-r from-primary to-secondary p-3 rounded-lg text-white">
                  <h3 className="text-sm font-bold mb-1.5 flex items-center gap-1">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Información de Contacto
                  </h3>
                  <a
                    href={`tel:${property.contact_phone}`}
                    className="flex items-center gap-3 bg-white/20 hover:bg-white/30 transition-all p-3 rounded-lg"
                  >
                    <div className="bg-white/20 p-2 rounded-full">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs opacity-90">Llamar o WhatsApp</div>
                      <div className="text-lg font-bold">{property.contact_phone}</div>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animation */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PropertyModal;
