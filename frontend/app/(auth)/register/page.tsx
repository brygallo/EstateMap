'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { Building2, User, Mail, Lock, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function RegisterPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const validationSchema = Yup.object({
    username: Yup.string().required('Campo requerido'),
    first_name: Yup.string().required('Campo requerido'),
    last_name: Yup.string().required('Campo requerido'),
    email: Yup.string().email('Correo inválido').required('Campo requerido'),
    password: Yup.string().required('Campo requerido'),
    confirm: Yup.string()
      .oneOf([Yup.ref('password')], 'Las contraseñas no coinciden')
      .required('Campo requerido'),
  });

  const handleSubmit = async (values: any, { setSubmitting, setErrors }: any) => {
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
        const formErrors: any = {};
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

      toast.success('Registro exitoso. Por favor verifica tu correo electrónico.');
      router.push(`/verificar-correo?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logo y título */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-primary shadow-card">
          <Building2 className="h-8 w-8 text-primary-foreground" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-bold text-textPrimary">Publica tu propiedad gratis</h1>
        <p className="mt-2 text-sm text-textSecondary">
          Crea tu cuenta y empieza a recibir contactos directos por teléfono o WhatsApp.
        </p>
      </div>

      {/* Formulario */}
      <Card className="rounded-card border-line bg-surface shadow-card">
        <CardContent className="p-8">
          <div className="mb-6 grid grid-cols-1 gap-2 text-sm">
            <div className="rounded-input bg-success/10 px-4 py-3 font-medium text-success">
              Publicación sin costo y sin comisiones.
            </div>
            <div className="rounded-input bg-primaryLight px-4 py-3 font-medium text-primary">
              Tu anuncio se muestra en el mapa con fotos, precio y ubicación.
            </div>
            <div className="rounded-input bg-warning/10 px-4 py-3 font-medium text-warning">
              Si tienes dudas, te ayudamos a publicarlo por WhatsApp.
            </div>
          </div>

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
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Field
                      as={Input}
                      id="username"
                      name="username"
                      type="text"
                      placeholder="tu_usuario"
                      className={`h-11 rounded-input pl-10 ${
                        errors.username && touched.username ? 'border-error focus-visible:ring-error' : ''
                      }`}
                    />
                  </div>
                  <ErrorMessage name="username" component="p" className="text-sm text-error" />
                </div>

                {/* First Name & Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nombre</Label>
                    <Field
                      as={Input}
                      id="first_name"
                      name="first_name"
                      type="text"
                      placeholder="Juan"
                      className={`h-11 rounded-input ${
                        errors.first_name && touched.first_name ? 'border-error focus-visible:ring-error' : ''
                      }`}
                    />
                    <ErrorMessage name="first_name" component="p" className="text-sm text-error" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name">Apellido</Label>
                    <Field
                      as={Input}
                      id="last_name"
                      name="last_name"
                      type="text"
                      placeholder="Pérez"
                      className={`h-11 rounded-input ${
                        errors.last_name && touched.last_name ? 'border-error focus-visible:ring-error' : ''
                      }`}
                    />
                    <ErrorMessage name="last_name" component="p" className="text-sm text-error" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Field
                      as={Input}
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      className={`h-11 rounded-input pl-10 ${
                        errors.email && touched.email ? 'border-error focus-visible:ring-error' : ''
                      }`}
                    />
                  </div>
                  <ErrorMessage name="email" component="p" className="text-sm text-error" />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Field
                      as={Input}
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className={`h-11 rounded-input pl-10 ${
                        errors.password && touched.password ? 'border-error focus-visible:ring-error' : ''
                      }`}
                    />
                  </div>
                  <ErrorMessage name="password" component="p" className="text-sm text-error" />
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar contraseña</Label>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Field
                      as={Input}
                      id="confirm"
                      name="confirm"
                      type="password"
                      placeholder="••••••••"
                      className={`h-11 rounded-input pl-10 ${
                        errors.confirm && touched.confirm ? 'border-error focus-visible:ring-error' : ''
                      }`}
                    />
                  </div>
                  <ErrorMessage name="confirm" component="p" className="text-sm text-error" />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-button bg-primary text-base font-semibold text-primary-foreground shadow-card transition-transform hover:bg-primaryHover active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      Crear cuenta y publicar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </Form>
            )}
          </Formik>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-surface px-4 text-textSecondary">O regístrate con</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <div className="mb-6">
            <GoogleSignInButton text="signup_with" />
          </div>

          {/* Login Link */}
          <p className="text-center text-sm text-textSecondary">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/iniciar-sesion" className="font-semibold text-primary transition-colors hover:text-secondary">
              Inicia sesión aquí
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-textSecondary">
        © {new Date().getFullYear()} Geo Propiedades Ecuador. Todos los derechos reservados.
      </p>
    </div>
  );
}
