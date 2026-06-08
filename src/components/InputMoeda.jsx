// Campo de preço em Real: o usuário digita números e vê "R$ 550.000" formatado;
// o valor guardado é o número inteiro (em reais). Usado em qualquer lugar que peça preço.
export default function InputMoeda({ value, onChange, placeholder = 'R$ 0', className, id }) {
  const disp = value || value === 0 ? 'R$ ' + Number(value).toLocaleString('pt-BR') : ''
  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      id={id}
      value={disp}
      placeholder={placeholder}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '')
        onChange(d ? parseInt(d, 10) : '')
      }}
    />
  )
}
