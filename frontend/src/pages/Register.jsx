import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const validationSchema = Yup.object({
    username: Yup.string().required('Campo requerido'),
    email: Yup.string().email('Correo inválido').required('Campo requerido'),
    password: Yup.string().required('Campo requerido'),
    confirm: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Las contraseñas no coinciden')
      .required('Campo requerido'),
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const res = await fetch(`${API_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: values.username, email: values.email, password: values.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.detail || 'Error al registrar');
        setSubmitting(false);
        return;
      }
      const loginRes = await fetch(`${API_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        toast.error(loginData.detail || 'Registro completado pero fallo el login');
        setSubmitting(false);
        return;
      }
      login(loginData.access, true);
      toast.success('Registro exitoso');
      navigate('/map');
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-2xl font-semibold mb-4 text-center">Registrarse</h1>
      <Formik
        initialValues={{ username: '', email: '', password: '', confirm: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div>
              <label className="block text-sm font-medium" htmlFor="username">Usuario</label>
              <Field
                id="username"
                name="username"
                type="text"
                className="w-full mt-1 p-2 border rounded"
              />
              <ErrorMessage name="username" component="p" className="text-error" />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="email">Email</label>
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
            <div>
              <label className="block text-sm font-medium" htmlFor="confirm">Confirmar Contraseña</label>
              <Field
                id="confirm"
                name="confirm"
                type="password"
                className="w-full mt-1 p-2 border rounded"
              />
              <ErrorMessage name="confirm" component="p" className="text-error" />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-primary text-white rounded-2xl hover:bg-secondary disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Cargando...' : 'Registrarse'}
            </button>
          </Form>
        )}
      </Formik>
      <p className="text-sm text-center mt-4">
        ¿Ya tienes cuenta? <Link to="/login" className="text-primary hover:underline">Iniciar sesión</Link>
      </p>
    </div>
  );
};

export default Register;

