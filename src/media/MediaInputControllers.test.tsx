import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import {
  MediaFilesInputController,
  mediaFilesInputControllerFactory,
  type MediaFilesFormInputInterface,
} from "@/media/MediaFilesInputController"
import {
  MediaImageInputController,
  type MediaImageFormInputInterface,
} from "@/media/MediaImageInputController"
import { MediaCompactContext, type MediaFileItemProps } from "@/media/mediaInput"
import type { MediaFile } from "@/media/mediaFile"

const KBIS: MediaFile = {
  name: "kbis.pdf",
  type: "application/pdf",
  size: 2048,
  url: "data:application/pdf;base64,JVBERi0=",
}

/** Holds the value the way a form does, and reports every change. */
function Harness<Input extends { value?: unknown }>({
  Controller,
  input,
  onValue,
}: {
  Controller: any
  input: Input
  onValue?: (value: unknown) => void
}) {
  const [formInput, setFormInput] = useState(input)

  return (
    <Controller
      formInput={formInput}
      onChange={(next: Input) => {
        setFormInput(next)
        onValue?.(next.value)
      }}
    />
  )
}

function pick(files: File[]) {
  const input = document.querySelector<HTMLInputElement>(
    "[data-slot=media-file-input]"
  )!
  fireEvent.change(input, { target: { files } })
}

describe("MediaFilesInputController", () => {
  it("adds picked files as base64 entries, and removes them", async () => {
    const onValue = vi.fn()
    render(
      <Harness<MediaFilesFormInputInterface>
        Controller={MediaFilesInputController}
        input={{ name: "documents", value: [KBIS] }}
        onValue={onValue}
      />
    )
    expect(screen.getByText("kbis.pdf")).toBeInTheDocument()

    pick([new File(["rib"], "rib.txt", { type: "text/plain" })])

    await waitFor(() => expect(screen.getByText("rib.txt")).toBeInTheDocument())
    expect(onValue).toHaveBeenLastCalledWith([
      KBIS,
      {
        name: "rib.txt",
        type: "text/plain",
        size: 3,
        url: "data:text/plain;base64,cmli",
      },
    ])

    fireEvent.click(screen.getByRole("button", { name: "Remove kbis.pdf" }))
    expect(onValue.mock.lastCall![0]).toHaveLength(1)
    expect(screen.queryByText("kbis.pdf")).not.toBeInTheDocument()
  })

  it("refuses a file of the wrong type or too large, and says why", async () => {
    const onValue = vi.fn()
    render(
      <Harness<MediaFilesFormInputInterface>
        Controller={MediaFilesInputController}
        input={{ value: [], accept: ["application/pdf"], maxSize: 4 }}
        onValue={onValue}
      />
    )

    pick([
      new File(["x"], "photo.png", { type: "image/png" }),
      new File(["too long"], "big.pdf", { type: "application/pdf" }),
    ])

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("photo.png is not an accepted file type")
    expect(alert).toHaveTextContent("big.pdf is too large: 4 B maximum.")
    expect(onValue).not.toHaveBeenCalled()
  })

  it("stops at maxFiles, and hides the drop zone once full", async () => {
    render(
      <Harness<MediaFilesFormInputInterface>
        Controller={MediaFilesInputController}
        input={{ value: [], maxFiles: 1 }}
      />
    )

    pick([new File(["a"], "a.txt"), new File(["b"], "b.txt")])

    expect(await screen.findByText("a.txt")).toBeInTheDocument()
    expect(screen.queryByText("b.txt")).not.toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Only 1 files can be attached."
    )
    expect(document.querySelector("[data-slot=media-dropzone]")).toBeNull()
  })

  it("stores through the factory's store, and draws the application's item", async () => {
    const store = vi.fn(async (file: File) => `/api/media/${file.name}`)
    const Row = ({ file }: MediaFileItemProps) => <p>custom {file.url}</p>
    const Controller = mediaFilesInputControllerFactory({
      store,
      components: { fileItem: Row },
    })
    render(<Harness Controller={Controller} input={{ value: [] }} />)

    pick([new File(["a"], "a.pdf", { type: "application/pdf" })])

    expect(await screen.findByText("custom /api/media/a.pdf")).toBeInTheDocument()
    expect(store).toHaveBeenCalledOnce()
  })

  it("only shows the files in a table cell or on a detail page", () => {
    const { unmount } = render(
      <MediaCompactContext value={true}>
        <MediaFilesInputController
          formInput={{ value: [KBIS] }}
          onChange={() => {}}
        />
      </MediaCompactContext>
    )
    expect(screen.getByRole("link", { name: /kbis\.pdf/ })).toHaveAttribute(
      "download",
      "kbis.pdf"
    )
    expect(document.querySelector("[data-slot=media-dropzone]")).toBeNull()
    unmount()

    render(
      <MediaFilesInputController
        formInput={{ value: [KBIS], readonly: true }}
        onChange={() => {}}
      />
    )
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument()
  })
})

describe("MediaImageInputController", () => {
  it("keeps a picked image as a data URL, and removes it", async () => {
    const onValue = vi.fn()
    render(
      <Harness<MediaImageFormInputInterface>
        Controller={MediaImageInputController}
        input={{ name: "logo", value: null }}
        onValue={onValue}
      />
    )
    expect(
      screen.getByText("Drop an image here, or click to browse")
    ).toBeInTheDocument()

    pick([new File(["png"], "logo.png", { type: "image/png" })])

    await waitFor(() =>
      expect(onValue).toHaveBeenLastCalledWith("data:image/png;base64,cG5n")
    )
    expect(
      document.querySelector("[data-slot=media-image-preview] img")
    ).toHaveAttribute("src", "data:image/png;base64,cG5n")

    fireEvent.click(screen.getByRole("button", { name: "Remove" }))
    expect(onValue).toHaveBeenLastCalledWith(null)
  })

  it("only takes images unless told otherwise", async () => {
    render(
      <Harness<MediaImageFormInputInterface>
        Controller={MediaImageInputController}
        input={{ value: null }}
      />
    )

    pick([new File(["%PDF"], "kbis.pdf", { type: "application/pdf" })])

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "kbis.pdf is not an accepted file type (image/*)."
    )
  })

  it("opens the crop dialog before keeping an image when cropping is on", async () => {
    const onValue = vi.fn()
    render(
      <Harness<MediaImageFormInputInterface>
        Controller={MediaImageInputController}
        input={{ value: null, crop: { aspect: 1 } }}
        onValue={onValue}
      />
    )

    pick([new File(["png"], "logo.png", { type: "image/png" })])

    expect(await screen.findByText("Crop the image")).toBeInTheDocument()
    expect(onValue).not.toHaveBeenCalled()
  })
})
