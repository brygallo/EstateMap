import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const validationSchema = Yup.object({
    email: Yup.string().email('Correo inválido').required('Campo requerido'),
    password: Yup.string().required('Campo requerido'),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const res = await fetch(`${API_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.detail || 'Credenciales incorrectas');
        return;
      }
      login(data.access, values.remember);
      toast.success('Inicio de sesión exitoso');
      navigate('/map');
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-2xl font-semibold mb-4 text-center">Iniciar Sesión</h1>
      <Formik
        initialValues={{ email: '', password: '', remember: false }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div>
              <label className="block text-sm font-medium" htmlFor="email">Correo electrónico</label>
              <Field
                id="email"
                name="email"
                type="email"
                className="w-full mt-1 p-2 border rounded"
              />
              <ErrorMessage name="email" component="p" className="text-error" />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="password">Contraseña</label>
              <Field
                id="password"
                name="password"
                type="password"
                className="w-full mt-1 p-2 border rounded"
              />
              <ErrorMessage name="password" component="p" className="text-error" />
            </div>
            <div className="flex items-center">
              <Field
                id="remember"
                name="remember"
                type="checkbox"
                className="mr-2"
              />
              <label htmlFor="remember">Recordar sesión</label>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-primary text-white rounded-2xl hover:bg-secondary disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Cargando...' : 'Entrar'}
            </button>
          </Form>
        )}
      </Formik>
      <Link to="/register" className="block text-center mt-4 text-primary hover:underline">
        Registrarse
      </Link>
    </div>
  );
};

export default Login;

