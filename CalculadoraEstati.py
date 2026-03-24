import streamlit as st
import pandas as pd
import statistics

st.set_page_config(page_title="Calculadora Estatística 1.0", layout="wide")

st.markdown("""
    <style>
    .stApp { background: transparent; }
    div[data-baseweb="input"] { 
        border: 1px solid #004400 !important; 
        background-color: rgba(0, 20, 0, 0.9) !important; 
    }
    div[data-baseweb="input"]:focus-within { 
        border: 1px solid #00ff00 !important; 
        box-shadow: 0 0 10px #00ff00 !important; 
    }
    h1, h2, h3, label, p, span, .stMarkdown { 
        color: #00ff00 !important; 
        font-family: 'Courier New', Courier, monospace; 
        text-shadow: 2px 2px 4px #000000; 
    }
    .stMetric { 
        background-color: rgba(0, 0, 0, 0.85) !important; 
        border: 2px solid #00ff00 !important; 
        border-radius: 10px; 
    }
    #matrix-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background-color: black; }
    </style>
    <canvas id="matrix-canvas"></canvas>
    <script>
    const canvas = document.getElementById('matrix-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const alphabet = '01'; 
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const rainDrops = Array.from({ length: columns }).fill(1);
    const draw = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0F0'; 
        ctx.font = fontSize + 'px monospace';
        for(let i = 0; i < rainDrops.length; i++) {
            const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);
            if(rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) rainDrops[i] = 0;
            rainDrops[i]++;
        }
    };
    setInterval(draw, 30);
    </script>
    """, unsafe_allow_html=True)

def calcular_estatisticas(valores, frequencias=None):
    try:
        v_float = [float(v) for v in valores if v is not None]
        if not v_float: return None
        
        if frequencias is not None:
            f_float = [float(f) for f in frequencias if f is not None]
            if len(v_float) != len(f_float): return None
            n = sum(f_float)
            if n < 2: return None
            
            media = sum(v * f for v, f in zip(v_float, f_float)) / n
            moda = v_float[f_float.index(max(f_float))]
            
            fac, mediana = 0, v_float[0]
            for v, f in zip(v_float, f_float):
                fac += f
                if fac >= n / 2:
                    mediana = v
                    break
            
            variancia = sum(f * (v - media)**2 for v, f in zip(v_float, f_float)) / (n - 1)
            desvio = variancia**0.5
            return media, mediana, moda, max(v_float) - min(v_float), desvio, variancia
        else:
            v_float = [float(x) for x in v_float]
            n = len(v_float)
            if n < 2: return None
            media = statistics.mean(v_float)
            mediana = statistics.median(v_float)
            moda = ", ".join(map(str, statistics.multimode(v_float)))
            desvio = statistics.stdev(v_float)
            variancia = statistics.variance(v_float)
            return media, mediana, moda, max(v_float) - min(v_float), desvio, variancia
    except:
        return None

with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/2103/2103633.png", width=100)
    st.title("Estatística Matrix")
    st.subheader("Calculadora Estatística Enzo Alves de Souza e Maycon Rezende Do Nascimento versão 1.0")
    st.divider()
    opcao = st.radio("Selecione a Funcionalidade:", ["Não Agrupados", "Agrupados (Sem Intervalo)", "Agrupados (Com Intervalo)"])

st.header(f"🖥️ {opcao}")

if opcao == "Não Agrupados":
    entrada = st.text_input("Valores (separados por vírgula):")
    if entrada:
        dados = [x.strip() for x in entrada.split(",") if x.strip()]
        res = calcular_estatisticas(dados)
        dados_ordenados = sorted([float(x) for x in dados])
        st.subheader("🔢 Rol (Dados Ordenados)")
        st.code(", ".join(map(str, dados_ordenados)))
        if res:
            m, md, mo, amp, dp, var = res
            c1, c2, c3 = st.columns(3)
            c1.metric("Média (x̄)", f"{m:.2f}")
            c2.metric("Mediana (Md)", f"{md}")
            c3.metric("Moda (Mo)", f"{mo}")
            st.markdown(f"**Variância ($s^2$):** {var:.4f} | **Desvio Padrão ($s$):** {dp:.4f} | **Amplitude:** {amp}")

elif opcao == "Agrupados (Sem Intervalo)":
    df = st.data_editor(pd.DataFrame({'xi': [None], 'fi': [None]}), num_rows="dynamic")
    if st.button("Calcular"):
        res = calcular_estatisticas(df['xi'].tolist(), df['fi'].tolist())
        
        if res:
            m, md, mo, amp, dp, var = res
            c1, c2, c3 = st.columns(3)
            c1.metric("Média (x̄)", f"{m:.2f}")
            c2.metric("Mediana (Md)", f"{md}")
            c3.metric("Moda (Mo)", f"{mo}")
            st.markdown(f"**Variância ($s^2$):** {var:.4f} | **Desvio Padrão ($s$):** {dp:.4f} | **Amplitude:** {amp}")

elif opcao == "Agrupados (Com Intervalo)":
    df_int = st.data_editor(pd.DataFrame({'Inf': [None], 'Sup': [None], 'fi': [None]}), num_rows="dynamic")
    if st.button("Processar Intervalos"):
        df_limpo = df_int.dropna()
        if not df_limpo.empty:
            pontos = (df_limpo['Inf'].astype(float) + df_limpo['Sup'].astype(float)) / 2
            res = calcular_estatisticas(pontos.tolist(), df_limpo['fi'].tolist())
            pontos_ordenados = sorted(pontos.tolist())
            st.subheader("🔢 Rol dos Pontos Médios (xi)")
            st.code(", ".join(map(str, pontos_ordenados)))
            if res:
                m, md, mo, amp, dp, var = res
                c1, c2, c3 = st.columns(3)
                c1.metric("Média (x̄)", f"{m:.2f}")
                c2.metric("Mediana (Md)", f"{md}")
                c3.metric("Moda (Mo)", f"{mo}")
                st.markdown(f"**Variância ($s^2$):** {var:.4f} | **Desvio Padrão ($s$):** {dp:.4f} | **Amplitude Total:** {df_limpo['Sup'].astype(float).max() - df_limpo['Inf'].astype(float).min()}")