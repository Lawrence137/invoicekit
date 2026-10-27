
"use client";

import { useState } from "react";

type Item = {
  id: number;
  description: string;
  quantity: number;
  price: number;
};

export default function Home() {
  const [business, setBusiness] = useState("Acme Studio");
  const [client, setClient] = useState("John Smith");
  const [invoiceNumber, setInvoiceNumber] = useState("INV-001");
  const [currency, setCurrency] = useState("KES");
  const [tax, setTax] = useState(0);
  const [items, setItems] = useState<Item[]>([
    { id: 1, description: "Website design", quantity: 1, price: 25000 },
    { id: 2, description: "Development", quantity: 1, price: 40000 },
  ]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const total = subtotal + (subtotal * tax) / 100;

  const money = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);

  function updateItem(
    id: number,
    field: keyof Item,
    value: string | number
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        description: "",
        quantity: 1,
        price: 0,
      },
    ]);
  }

  function removeItem(id: number) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="/" className="text-xl font-bold tracking-tight">
            Invoice<span className="text-blue-600">Kit</span>
          </a>
          <span className="text-sm text-slate-500">
            Simple invoicing for everyone
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">
            WORKSPACE / INVOICES
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Create an invoice
          </h1>
          <p className="mt-2 text-slate-500">
            Add your details and preview your invoice in real time.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-2">
          {/* Invoice editor */}
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Invoice details</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Your business
                  <input
                    value={business}
                    onChange={(e) => setBusiness(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Your business name"
                  />
                </label>

                <label className="text-sm font-medium">
                  Client name
                  <input
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Client name"
                  />
                </label>

                <label className="text-sm font-medium">
                  Invoice number
                  <input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-sm font-medium">
                  Currency
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                  >
                    <option value="KES">KES — Kenyan Shilling</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Line items</h2>
                <button
                  onClick={addItem}
                  className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  + Add item
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Item {index + 1}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        Remove
                      </button>
                    </div>

                    <input
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                      placeholder="Description of service"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="text-xs font-medium text-slate-500">
                        Quantity
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "quantity",
                              Math.max(0, Number(e.target.value))
                            )
                          }
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-500">
                        Unit price
                        <input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "price",
                              Math.max(0, Number(e.target.value))
                            )
                          }
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                        />
                      </label>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
                    No items yet. Click Add item to get started.
                  </p>
                )}
              </div>

              <label className="mt-5 block text-sm font-medium">
                Tax rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tax}
                  onChange={(e) =>
                    setTax(Math.min(100, Math.max(0, Number(e.target.value))))
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                />
              </label>
            </div>
          </section>

          {/* Live invoice preview */}
          <section className="lg:sticky lg:top-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Live preview</h2>
              <button
                onClick={() => window.print()}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Print / Save PDF
              </button>
            </div>

            <article className="min-h-[600px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold tracking-tight">
                    {business || "Your business"}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Invoice issued by
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-3xl font-light tracking-widest text-blue-600">
                    INVOICE
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    #{invoiceNumber}
                  </p>
                </div>
              </div>

              <div className="my-8 border-t border-slate-200" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Bill to
                  </p>
                  <p className="mt-2 font-semibold">
                    {client || "Client name"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Date issued
                  </p>
                  <p className="mt-2 text-sm">
                    {new Date().toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>

              <div className="mt-9 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-3 font-medium">Description</th>
                      <th className="pb-3 text-right font-medium">Qty</th>
                      <th className="pb-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-4 pr-2">
                          {item.description || "Untitled item"}
                        </td>
                        <td className="py-4 text-right">{item.quantity}</td>
                        <td className="py-4 text-right whitespace-nowrap">
                          {money(item.quantity * item.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto mt-8 max-w-xs space-y-3 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax ({tax}%)</span>
                  <span>{money((subtotal * tax) / 100)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-4 text-lg font-bold">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>

              <div className="mt-14 border-t border-slate-200 pt-5">
                <p className="font-semibold">Thank you for your business!</p>
                <p className="mt-1 text-xs text-slate-400">
                  Please contact us if you have any questions about this invoice.
                </p>
              </div>
            </article>
          </section>
        </div>

        <footer className="py-8 text-center text-xs text-slate-400">
          InvoiceKit · Simple invoicing, done right.
        </footer>
      </div>
    </main>
  );
}
