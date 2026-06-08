import { Navigate } from 'react-router-dom'

// O painel antigo (que usava uma chave fixa na URL) foi aposentado por segurança.
// Tudo agora vive no painel seguro /admin (login com e-mail + senha no servidor).
export default function Painel() {
  return <Navigate to="/admin" replace />
}
