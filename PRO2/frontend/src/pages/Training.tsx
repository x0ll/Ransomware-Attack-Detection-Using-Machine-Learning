import { useState, useEffect, useRef } from 'react'
import { API_BASE_URL } from '../lib/api-config'
import { Upload, Database, Cpu, CheckCircle, ChevronRight,
         BarChart2, Layers, Zap, Shield, Trash2, Play } from 'lucide-react'

interface Dataset { filename:string; size:number; uploadTime:string; columns:number }
interface ModelInfo { name:string; isActive:boolean; size:number; trainedAt:string; metrics:any; dataset:string; totalRows:number }
interface TrainLog  { modelName:string; dataset:string; trainedAt:string; totalRows:number; nEstimators:number; metrics:any }

type Step = 'upload' | 'configure' | 'training' | 'done'

export default function Training() {
  const [step, setStep]           = useState<Step>('upload')
  const [datasets, setDatasets]   = useState<Dataset[]>([])
  const [models, setModels]       = useState<ModelInfo[]>([])
  const [logs, setLogs]           = useState<TrainLog[]>([])
  const [activeModel, setActive]  = useState('')
  const [selected, setSelected]   = useState<string>('')
  const [nTrees, setNTrees]       = useState(320)
  const [modelName, setModelName] = useState('')
  const [progress, setProgress]   = useState(0)
  const [result, setResult]       = useState<TrainLog|null>(null)
  const [error, setError]         = useState<string|null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const refresh = async () => {
    const [d,m,l,a] = await Promise.all([
      fetch(`${API_BASE_URL}/api/training/datasets`).then(r=>r.json()),
      fetch(`${API_BASE_URL}/api/training/models`).then(r=>r.json()),
      fetch(`${API_BASE_URL}/api/training/log`).then(r=>r.json()),
      fetch(`${API_BASE_URL}/api/training/active`).then(r=>r.json()),
    ])
    setDatasets(d); setModels(m); setLogs(l); setActive(a.activeModel)
  }

  // Fetch datasets, models, training log, and active model name in parallel on mount
  useEffect(() => { refresh() }, [])

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) { setError('Only CSV files accepted'); return }
    setUploading(true); setError(null)
    // Build a multipart form and POST the CSV file to the backend
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch(`${API_BASE_URL}/api/training/upload`, { method:'POST', body:fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await refresh()
      // Auto-select the uploaded dataset and advance to the configure step
      setSelected(data.filename)
      setStep('configure')
    } catch(e:any) { setError(e.message) }
    finally { setUploading(false) }
  }

  const handleTrain = async () => {
    if (!selected) return
    setStep('training'); setProgress(0); setError(null)
    // Simulate incremental progress while the backend trains the model
    const iv = setInterval(() => setProgress(p => p < 90 ? p + Math.random()*8 : p), 400)
    try {
      const res = await fetch(`${API_BASE_URL}/api/training/train`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ filename: selected, nEstimators: nTrees, modelName })
      })
      const data = await res.json()
      clearInterval(iv); setProgress(100)
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      // Refresh the saved models list to include the newly trained model
      await refresh()
      setTimeout(() => setStep('done'), 500)
    } catch(e:any) { clearInterval(iv); setError(e.message); setStep('configure') }
  }

  const handleActivate = async (name: string) => {
    // Tell the backend to update active_model.txt to point to the selected model
    await fetch(`${API_BASE_URL}/api/training/activate`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ modelName: name })
    })
    // Refresh the model list to update the ACTIVE badge in the UI
    await refresh()
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Model Training</h1>
          <p className="text-gray-400 text-sm">Upload dataset → Train model → Activate for detection</p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-2 rounded-lg w-fit">
          <Zap className="w-3.5 h-3.5 text-green-400"/>
          <span className="text-green-400 text-xs font-medium">Active: {activeModel}</span>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
        {(['upload','configure','training','done'] as Step[]).map((s,i) => (
          <div key={s} className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${step === s ? 'bg-green-500 text-black' :
                (['upload','configure','training','done'].indexOf(step) > i) ? 'bg-green-500/30 text-green-400' :
                'bg-[#1e2a3a] text-gray-500'}`}>
              {(['upload','configure','training','done'].indexOf(step) > i) ? '✓' : i+1}
            </div>
            <span className={`text-xs capitalize ${step===s?'text-white':'text-gray-500'}`}>{s}</span>
            {i < 3 && <ChevronRight className="w-3 h-3 text-gray-600"/>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: wizard */}
        <div className="lg:col-span-2 space-y-4">

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="bg-[#0d1117] border border-[#1e2a3a] rounded-xl p-6">
              <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                <Upload className="w-4 h-4 text-green-400"/>Step 1: Upload Dataset
              </h3>
              <p className="text-gray-500 text-xs mb-4">Upload a CSV file with file features + label column (Benign/label/class)</p>

              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg mb-4">{error}</div>}

              <div className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center cursor-pointer transition-all
                ${dragging?'border-green-400 bg-green-400/5':'border-[#1e2a3a] hover:border-green-500/40'}`}
                onDragOver={e=>{e.preventDefault();setDragging(true)}}
                onDragLeave={()=>setDragging(false)}
                onDrop={e=>{e.preventDefault();setDragging(false);e.dataTransfer.files[0]&&handleUpload(e.dataTransfer.files[0])}}
                onClick={()=>inputRef.current?.click()}>
                <input ref={inputRef} type="file" accept=".csv" className="hidden"
                  onChange={e=>e.target.files?.[0]&&handleUpload(e.target.files[0])}/>
                {uploading
                  ? <><Cpu className="w-10 h-10 text-green-400 animate-pulse mb-3"/><p className="text-green-400 text-sm">Uploading...</p></>
                  : <><Database className="w-10 h-10 text-gray-500 mb-3"/>
                    <p className="text-white text-sm font-medium mb-1">Drop CSV dataset here</p>
                    <p className="text-gray-500 text-xs mb-4">Must have a target column: Benign / label / class</p>
                    <button className="bg-green-500 hover:bg-green-600 text-black font-bold px-6 py-2 rounded-lg text-sm"
                      onClick={e=>{e.stopPropagation();inputRef.current?.click()}}>Browse CSV</button></>}
              </div>

              {/* Existing datasets */}
              {datasets.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-400 text-xs mb-2">Or select existing dataset:</p>
                  <div className="space-y-2">
                    {datasets.map(d => (
                      <div key={d.filename} onClick={()=>{setSelected(d.filename);setStep('configure')}}
                        className="flex items-center justify-between bg-[#0a0e1a] border border-[#1e2a3a] hover:border-green-500/40 rounded-lg p-3 cursor-pointer transition-all">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-blue-400"/>
                          <span className="text-white text-xs">{d.filename}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 text-xs">{d.columns} cols</span>
                          <span className="text-gray-500 text-xs">{(d.size/1024).toFixed(0)} KB</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-500"/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Configure */}
          {step === 'configure' && (
            <div className="bg-[#0d1117] border border-[#1e2a3a] rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-green-400"/>Step 2: Configure Training
              </h3>
              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg mb-4">{error}</div>}

              <div className="space-y-4">
                <div className="bg-[#0a0e1a] border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
                  <Database className="w-4 h-4 text-green-400"/>
                  <div>
                    <p className="text-white text-xs font-medium">{selected}</p>
                    <p className="text-gray-500 text-[10px]">Selected dataset</p>
                  </div>
                  <button onClick={()=>setStep('upload')} className="ml-auto text-gray-500 hover:text-white text-[10px] border border-[#1e2a3a] px-2 py-1 rounded">Change</button>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-2 block">Model Name (optional)</label>
                  <input type="text" value={modelName} onChange={e=>setModelName(e.target.value)}
                    placeholder="e.g. ransomware_detector_v2"
                    className="w-full bg-[#0a0e1a] border border-[#1e2a3a] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-green-500/50"/>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-2 block">
                    Number of Trees: <span className="text-green-400 font-bold">{nTrees}</span>
                  </label>
                  <input type="range" min={50} max={500} step={10} value={nTrees}
                    onChange={e=>setNTrees(Number(e.target.value))}
                    className="w-full accent-green-500 cursor-pointer"/>
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                    <span>50 (Fast)</span><span>320 (Recommended)</span><span>500 (Accurate)</span>
                  </div>
                </div>

                <div className="bg-[#0a0e1a] rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-2">Training method: <span className="text-white">5-Fold Cross Validation</span></p>
                  <p className="text-gray-400 text-xs">Algorithm: <span className="text-white">Random Forest (from EDA notebook)</span></p>
                </div>

                <button onClick={handleTrain}
                  className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                  <Play className="w-4 h-4"/> Start Training
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Training progress */}
          {step === 'training' && (
            <div className="bg-[#0d1117] border border-[#1e2a3a] rounded-xl p-6">
              <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-green-400 animate-pulse"/>Training in progress...
              </h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Random Forest · {nTrees} trees · 5-Fold CV</span>
                <span className="text-green-400 font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-[#1e2a3a] rounded-full h-3 mb-6">
                <div className="bg-green-500 h-3 rounded-full transition-all duration-300" style={{width:progress+'%'}}/>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {['Fold 1','Fold 2','Fold 3','Fold 4','Fold 5'].map((f,i)=>(
                  <div key={f} className={`text-center py-2 rounded-lg text-xs transition-all
                    ${progress > (i+1)*18 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[#1e2a3a] text-gray-600'}`}>
                    {progress > (i+1)*18 ? '✓' : '○'} {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === 'done' && result && (
            <div className="bg-[#0d1117] border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-green-400"/>
                </div>
                <div>
                  <p className="text-green-400 font-bold text-lg">Training Complete!</p>
                  <p className="text-gray-400 text-xs">{result.modelName}</p>
                </div>
                <button onClick={()=>{setStep('upload');setResult(null);setSelected('');setModelName('')}}
                  className="ml-auto text-gray-400 hover:text-white text-xs border border-[#1e2a3a] px-3 py-1.5 rounded-lg">New Training</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  {l:'Accuracy',  v:(result.metrics.accuracy*100).toFixed(2)+'%'},
                  {l:'Precision', v:(result.metrics.precision*100).toFixed(2)+'%'},
                  {l:'Recall',    v:(result.metrics.recall*100).toFixed(2)+'%'},
                  {l:'F1-Score',  v:(result.metrics.f1*100).toFixed(2)+'%'},
                ].map(({l,v})=>(
                  <div key={l} className="bg-[#0a0e1a] rounded-lg p-3 text-center border border-green-500/20">
                    <p className="text-gray-400 text-xs mb-1">{l}</p>
                    <p className="text-green-400 font-bold text-lg">{v}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#0a0e1a] rounded-lg p-3 mb-4 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between"><span>Dataset</span><span className="text-white">{result.dataset}</span></div>
                <div className="flex justify-between"><span>Rows</span><span className="text-white">{result.totalRows.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Trees</span><span className="text-white">{result.nEstimators}</span></div>
                <div className="flex justify-between"><span>Folds</span><span className="text-white">5</span></div>
              </div>

              <button onClick={()=>handleActivate(result.modelName)}
                className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                  ${activeModel === result.modelName
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-green-500 hover:bg-green-600 text-black'}`}>
                <Shield className="w-4 h-4"/>
                {activeModel === result.modelName ? '✓ Already Active' : 'Activate This Model'}
              </button>
            </div>
          )}
        </div>

        {/* Right: saved models */}
        <div className="space-y-4">
          <div className="bg-[#0d1117] border border-[#1e2a3a] rounded-xl p-4">
            <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-400"/>Saved Models ({models.length})
            </h3>
            {models.length === 0
              ? <p className="text-gray-600 text-xs text-center py-4">No trained models yet</p>
              : <div className="space-y-2 max-h-80 overflow-y-auto">
                  {models.map(m => (
                    <div key={m.name} className={`rounded-lg p-3 border transition-all
                      ${m.isActive ? 'border-green-500/40 bg-green-500/5' : 'border-[#1e2a3a] bg-[#0a0e1a]'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-xs font-medium truncate max-w-[120px]">{m.name}</span>
                        {m.isActive
                          ? <span className="text-[9px] bg-green-500 text-black px-2 py-0.5 rounded font-bold">ACTIVE</span>
                          : <button onClick={()=>handleActivate(m.name)}
                              className="text-[9px] border border-green-500/40 text-green-400 px-2 py-0.5 rounded hover:bg-green-500/10">
                              Activate
                            </button>}
                      </div>
                      <p className="text-gray-600 text-[10px]">{m.dataset}</p>
                      {m.metrics?.accuracy && (
                        <p className="text-green-400 text-[10px] font-medium mt-1">
                          ACC: {(m.metrics.accuracy*100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>}
          </div>

          {logs.length > 0 && (
            <div className="bg-[#0d1117] border border-[#1e2a3a] rounded-xl p-4">
              <h3 className="text-white text-sm font-semibold mb-3">Training History</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {logs.slice(0,5).map((l,i) => (
                  <div key={i} className="border-b border-[#1e2a3a] pb-2 last:border-0">
                    <p className="text-gray-300 text-[10px] font-medium truncate">{l.modelName}</p>
                    <p className="text-gray-600 text-[10px]">{l.trainedAt}</p>
                    <p className="text-green-400 text-[10px]">ACC: {(l.metrics?.accuracy*100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
