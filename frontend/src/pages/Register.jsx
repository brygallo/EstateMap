import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

const Register = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const validationSchema = Yup.object({
    username: Yup.string().required('Campo requerido'),
    first_name: Yup.string().required('Campo requerido'),
    last_name: Yup.string().required('Campo requerido'),
    email: Yup.string().email('Correo inválido').required('Campo requerido'),
    password: Yup.string().required('Campo requerido'),
    confirm: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Las contraseñas no coinciden')
      .required('Campo requerido'),
  });

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      const res = await fetch(`${API_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          password: values.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const formErrors = {};
        let errorMessage = data.detail;
        Object.keys(data).forEach((field) => {
          const messages = Array.isArray(data[field]) ? data[field] : [data[field]];
          formErrors[field] = messages.join(' ');
        });
        if (!errorMessage) {
          errorMessage = Object.values(formErrors).join(' ');
        }
        setErrors(formErrors);
        toast.error(errorMessage || 'Error al registrar');
        setSubmitting(false);
        return;
      }

      // Registro exitoso - redirigir a verificación de email
      toast.success('Registro exitoso. Por favor verifica tu correo electrónico.');
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo y título */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Geo Propiedades Ecuador</h2>
          <p className="mt-2 text-sm text-gray-600">Crea tu cuenta para comenzar</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <Formik
            initialValues={{
              username: '',
              first_name: '',
              last_name: '',
              email: '',
              password: '',
              confirm: '',
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form className="space-y-5">
                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                    Usuario
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <Field
                      id="username"
                      name="username"
                      type="text"
                      placeholder="tu_usuario"
                      className={`w-full pl-10 pr-4 py-3 border ${
                        errors.username && touched.username ? 'border-red-500' : 'border-gray-300'
                      } rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                    />
                  </div>
                  <ErrorMessage name="username" component="p" className="mt-1 text-sm text-red-600" />
                </div>

                {/* First Name & Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre
                    </label>
                    <Field
                      id="first_name"
                      name="first_name"
                      type="text"
                      placeholder="Juan"
                      className={`w-full px-4 py-3 border ${
                        errors.first_name && touched.first_name ? 'border-red-500' : 'border-gray-300'
                      } rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                    />
                    <ErrorMessage name="first_name" component="p" className="mt-1 text-sm text-red-600" />
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Apellido
                    </label>
                    <Field
                      id="last_name"
                      name="last_name"
                      type="text"
                      placeholder="Pérez"
                      className={`w-full px-4 py-3 border ${
                        errors.last_name && touched.last_name ? 'border-red-500' : 'border-gray-300'
                      } rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                    />
                    <ErrorMessage name="last_name" component="p" className="mt-1 text-sm text-red-600" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <Field
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      className={`w-full pl-10 pr-4 py-3 border ${
                        errors.email && touched.email ? 'border-red-500' : 'border-gray-300'
                      } rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                    />
                  </div>
                  <ErrorMessage name="email" component="p" className="mt-1 text-sm text-red-600" />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <Field
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-4 py-3 border ${
                        errors.password && touched.password ? 'border-red-500' : 'border-gray-300'
                      } rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                    />
                  </div>
                  <ErrorMessage name="password" component="p" className="mt-1 text-sm text-red-600" />
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirm" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <Field
                      id="confirm"
                      name="confirm"
                      type="password"
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-4 py-3 border ${
                        errors.confirm && touched.confirm ? 'border-red-500' : 'border-gray-300'
                      } rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                    />
                  </div>
                  <ErrorMessage name="confirm" component="p" className="mt-1 text-sm text-red-600" />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      Crear cuenta
                      <svg className="ml-2 -mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </Form>
            )}
          </Formik>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="font-semibold text-primary hover:text-secondary transition-colors">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2025 Geo Propiedades Ecuador. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default Register;

