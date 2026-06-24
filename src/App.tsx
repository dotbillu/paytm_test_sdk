import { useState } from 'react'
import { loadPaytmScript, resolvePaytmHost, waitForCheckoutJs } from './paytm-checkout-client'
import { Loader2 } from 'lucide-react'

function App() {
  const [formData, setFormData] = useState({
    orderId: '',
    txnToken: '',
    amount: '',
    mid: '',
    callbackUrl: '',
    isAutopay: false
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apiResponse, setApiResponse] = useState<any | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    setApiResponse(null)

    try {
      if (!formData.orderId || !formData.txnToken || !formData.amount || !formData.mid) {
        throw new Error('Please fill in all required fields (Order ID, Token, Amount, MID)')
      }

      const host = resolvePaytmHost(formData.callbackUrl)
      await loadPaytmScript(formData.mid, host)
      await waitForCheckoutJs()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cjs = (window as any).Paytm?.CheckoutJS
      if (!cjs) throw new Error("Paytm CheckoutJS unavailable")

      const config = {
        root: "",
        flow: formData.isAutopay ? "SUBSCRIPTION" : "DEFAULT",
        data: {
          orderId: formData.orderId,
          token: formData.txnToken,
          tokenType: "TXN_TOKEN",
          amount: parseFloat(formData.amount).toFixed(2),
        },
        merchant: { mid: formData.mid, redirect: false },
        handler: {
          notifyMerchant: (eventName: string) => {
            if (eventName === "APP_CLOSED" || eventName === "SESSION_EXPIRED") {
              setLoading(false)
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transactionStatus: async (response: any) => {
            setApiResponse(response)
            try {
              cjs.close()
            } catch {
              /* ignore */
            }
            if (response?.STATUS === "TXN_SUCCESS") {
              setSuccess('Payment successful! (Simulated response from SDK)')
            } else {
              setError("Payment not completed. Status: " + (response?.STATUS || 'Unknown'))
            }
            setLoading(false)
          },
        },
      }

      await cjs.init(config)
      cjs.invoke()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Initialization failed")
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', alignItems: 'center' }}>
      <div className="card" style={{ width: '100%' }}>
        <h1>Paytm Manual SDK</h1>
        <p className="subtitle">Simulate backend response parameters locally</p>
        
        <form onSubmit={handlePayNow}>
          <div className="form-group">
            <label htmlFor="mid">Merchant ID (MID) *</label>
            <input 
              type="text" 
              id="mid" 
              name="mid" 
              value={formData.mid} 
              onChange={handleChange} 
              placeholder="e.g. Paytm123456789"
            />
          </div>

          <div className="form-group">
            <label htmlFor="orderId">Order ID *</label>
            <input 
              type="text" 
              id="orderId" 
              name="orderId" 
              value={formData.orderId} 
              onChange={handleChange} 
              placeholder="e.g. ORD_12345"
            />
          </div>

          <div className="form-group">
            <label htmlFor="txnToken">Transaction Token *</label>
            <input 
              type="text" 
              id="txnToken" 
              name="txnToken" 
              value={formData.txnToken} 
              onChange={handleChange} 
              placeholder="eyJ..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount (INR) *</label>
            <input 
              type="text" 
              id="amount" 
              name="amount" 
              value={formData.amount} 
              onChange={handleChange} 
              placeholder="e.g. 100.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="callbackUrl">Callback URL (Optional)</label>
            <input 
              type="text" 
              id="callbackUrl" 
              name="callbackUrl" 
              value={formData.callbackUrl} 
              onChange={handleChange} 
              placeholder="Used to detect stage/prod environment"
            />
          </div>

          <div className="form-group checkbox-group">
            <input 
              type="checkbox" 
              id="isAutopay" 
              name="isAutopay" 
              checked={formData.isAutopay} 
              onChange={handleChange} 
            />
            <label htmlFor="isAutopay">Is Autopay (Subscription Flow)</label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 className="animate-spin" size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Initializing...
              </span>
            ) : (
              'Invoke Paytm SDK'
            )}
          </button>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </form>
      </div>

      {apiResponse && (
        <div className="card" style={{ width: '100%', marginTop: 0 }}>
          <h2 style={{ fontSize: '1.2rem', color: '#e2e8f0', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>SDK Output payload</h2>
          <pre style={{ 
            background: 'rgba(15, 23, 42, 0.8)', 
            padding: '1rem', 
            borderRadius: '8px', 
            overflowX: 'auto', 
            color: '#a5b4fc',
            fontSize: '0.9rem',
            border: '1px solid #334155'
          }}>
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default App
