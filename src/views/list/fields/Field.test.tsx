import { afterEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { configurePorts, getPorts } from "@/ports"
import {
  Field,
  useFieldVisibility,
  useFieldVisible,
} from "@/views/list/fields/Field"
import { FieldVisibilityProvider } from "@/views/list/fields/FieldVisibilityProvider"
import {
  localFieldVisibilityStore,
  type FieldVisibilityState,
  type FieldVisibilityStoreInterface,
} from "@/views/list/fields/fieldVisibility"

afterEach(() => {
  configurePorts({ fieldVisibility: localFieldVisibilityStore })
  window.localStorage.clear()
})

let counter = 0
const nextId = () => `field_${++counter}`

/** A record drawn the way a list component of one's own would. */
function Card() {
  const visibility = useFieldVisibility()
  const showsEmail = useFieldVisible("user.email")

  return (
    <div>
      <Field name="price">
        <span>12 €</span>
      </Field>
      <Field name="user.name">
        <span>Ada</span>
      </Field>
      {showsEmail && <span>ada@example.org</span>}
      <button onClick={() => visibility?.setVisible("user", false)}>
        hide user
      </button>
      <button onClick={() => visibility?.setVisible("user.email", false)}>
        hide email
      </button>
      <button onClick={() => visibility?.setVisible("price", true)}>
        show price
      </button>
    </div>
  )
}

describe("<Field> and useFieldVisible", () => {
  it("draw everything outside a list", () => {
    render(<Card />)

    expect(screen.getByText("12 €")).toBeInTheDocument()
    expect(screen.getByText("ada@example.org")).toBeInTheDocument()
  })

  it("hide a field declared hidden until it is shown", () => {
    render(
      <FieldVisibilityProvider resourceId={nextId()} defaults={["price"]}>
        <Card />
      </FieldVisibilityProvider>
    )
    expect(screen.queryByText("12 €")).toBeNull()

    fireEvent.click(screen.getByText("show price"))
    expect(screen.getByText("12 €")).toBeInTheDocument()
  })

  it("hide a nested field alone, or with its parent", () => {
    render(
      <FieldVisibilityProvider resourceId={nextId()}>
        <Card />
      </FieldVisibilityProvider>
    )

    fireEvent.click(screen.getByText("hide email"))
    expect(screen.queryByText("ada@example.org")).toBeNull()
    expect(screen.getByText("Ada")).toBeInTheDocument()

    fireEvent.click(screen.getByText("hide user"))
    expect(screen.queryByText("Ada")).toBeNull()
  })

  it("share the choice between the layouts of a resource, and keep it", () => {
    const id = nextId()
    const { unmount } = render(
      <FieldVisibilityProvider resourceId={id}>
        <Card />
      </FieldVisibilityProvider>
    )
    fireEvent.click(screen.getByText("hide user"))
    unmount()

    render(
      <FieldVisibilityProvider resourceId={id}>
        <Card />
      </FieldVisibilityProvider>
    )
    expect(screen.queryByText("Ada")).toBeNull()
  })

  it("forget the choice with persist: false", () => {
    const id = nextId()
    const { unmount } = render(
      <FieldVisibilityProvider resourceId={id} persist={false}>
        <Card />
      </FieldVisibilityProvider>
    )
    fireEvent.click(screen.getByText("hide user"))
    expect(screen.queryByText("Ada")).toBeNull()
    unmount()

    render(
      <FieldVisibilityProvider resourceId={id} persist={false}>
        <Card />
      </FieldVisibilityProvider>
    )
    expect(screen.getByText("Ada")).toBeInTheDocument()
  })
})

describe("the fieldVisibility port", () => {
  it("defaults to the local store", () => {
    configurePorts({ fieldVisibility: undefined })
    expect(getPorts().fieldVisibility).toBeUndefined()

    const id = nextId()
    render(
      <FieldVisibilityProvider resourceId={id}>
        <Card />
      </FieldVisibilityProvider>
    )
    fireEvent.click(screen.getByText("hide user"))
    expect(localFieldVisibilityStore.read(id)).toEqual({
      hidden: ["user"],
      shown: [],
    })
  })

  it("reads, writes and follows an asynchronous store", async () => {
    const id = nextId()
    let stored: FieldVisibilityState | null = { hidden: ["price"], shown: [] }
    let notify = () => {}
    const store: FieldVisibilityStoreInterface = {
      read: vi.fn(async () => stored),
      write: vi.fn(async (_resource, state) => {
        stored = state
      }),
      subscribe: vi.fn((_resource, listener) => {
        notify = listener
        return () => {}
      }),
    }
    configurePorts({ fieldVisibility: store })

    render(
      <FieldVisibilityProvider resourceId={id}>
        <Card />
      </FieldVisibilityProvider>
    )
    await waitFor(() => expect(screen.queryByText("12 €")).toBeNull())
    expect(store.read).toHaveBeenCalledWith(id)

    fireEvent.click(screen.getByText("hide email"))
    expect(store.write).toHaveBeenCalledWith(id, {
      hidden: ["price", "user.email"],
      shown: [],
    })

    // Changed elsewhere: the list follows.
    stored = { hidden: [], shown: [] }
    act(() => notify())
    await waitFor(() => expect(screen.getByText("12 €")).toBeInTheDocument())
    expect(store.subscribe).toHaveBeenCalledWith(id, expect.any(Function))
  })
})
