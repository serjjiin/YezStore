import ArtesaoForm from '../ArtesaoForm'

export default function NovoArtesaoPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 34, marginBottom: 4 }}>
          Novo artesão
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
          Cadastre um novo parceiro
        </div>
      </div>
      <ArtesaoForm />
    </div>
  )
}
