// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import ProdutoForm from '../ProdutoForm'

vi.mock('@/app/lib/supabase-browser', () => ({
  createSupabaseBrowserClient: vi.fn(() => ({
    storage: { from: vi.fn(() => ({ upload: vi.fn(), getPublicUrl: vi.fn() })) },
  })),
}))

vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ push: vi.fn() })) }))

const createObjectURLMock = vi.fn()
const revokeObjectURLMock = vi.fn()

const artisans = [{ id: 'art-1', name: 'Ana' }]

describe('ProdutoForm — URL.createObjectURL memory leak', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createObjectURLMock.mockImplementation(() => `blob:fake-${Math.random()}`)
    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock
  })

  it('revoga URL anterior ao selecionar nova imagem', () => {
    const { container } = render(<ProdutoForm artisans={artisans} />)
    const input = container.querySelector('input[type="file"]')!

    const file1 = new File(['a'], 'foto1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['b'], 'foto2.jpg', { type: 'image/jpeg' })

    fireEvent.change(input, { target: { files: [file1] } })
    expect(createObjectURLMock).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLMock).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { files: [file2] } })
    expect(createObjectURLMock).toHaveBeenCalledTimes(2)
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1)
  })

  it('revoga URL ao desmontar o componente', () => {
    const { container, unmount } = render(<ProdutoForm artisans={artisans} />)
    const input = container.querySelector('input[type="file"]')!

    const file = new File(['a'], 'foto.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(revokeObjectURLMock).not.toHaveBeenCalled()
    unmount()
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1)
  })

  it('não chama revokeObjectURL ao desmontar sem imagem selecionada', () => {
    const { unmount } = render(<ProdutoForm artisans={artisans} />)
    unmount()
    expect(revokeObjectURLMock).not.toHaveBeenCalled()
  })
})
