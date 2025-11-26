import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Dynamically import Prisma to avoid crashing module evaluation
    // if the generated client has issues. This lets the route handle
    // the error and return a sensible response while we debug.
    let prisma = null
    try {
      const imported = await import('@prisma/client')
      const { PrismaClient } = imported
      const globalForPrisma = globalThis
      // Pass an explicit empty options object to avoid runtime code that
      // incorrectly tries to read properties from an undefined `options` arg.
      prisma = globalForPrisma.prisma || new PrismaClient({})
      if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
      console.log('Prisma client loaded dynamically')
    } catch (err) {
      console.error('Prisma dynamic import failed:', err && err.message ? err.message : err)
      prisma = null
    }

    // Load data. Prefer direct SQLite read via `better-sqlite3` (faster
    // and avoids Prisma runtime issues). If `better-sqlite3` isn't installed
    // we fall back to Prisma (if it loads correctly), otherwise use mock data.
    let todosExames = []
    let loadedFrom = 'none'

    try {
      // try direct sqlite access
      const Database = await (async () => {
        try {
          return require('better-sqlite3')
        } catch (e) {
          return null
        }
      })()

      if (Database) {
        const path = require('path')
        // Use process.cwd() to locate the prisma DB at runtime so the
        // Next.js bundler doesn't try to resolve a relative import to the
        // database file during compilation. This works cross-platform.
        const dbPath = path.join(process.cwd(), 'prisma', 'exames.db')
        const db = new Database(dbPath, { readonly: true })
        const rows = db.prepare('SELECT * FROM exame_medico').all()
        todosExames = rows.map(r => ({
          id_exame: r.id_exame,
          empresa: r.empresa,
          medico_responsavel: r.medico_responsavel,
          data_exame: r.data_exame,
          tipo_exame: r.tipo_exame,
          resultado: r.resultado,
          afastamento: r.afastamento
        }))
        db.close()
        loadedFrom = 'better-sqlite3'
      } else if (prisma && prisma.exameMedico && typeof prisma.exameMedico.findMany === 'function') {
        todosExames = await prisma.exameMedico.findMany()
        loadedFrom = 'prisma'
      } else {
        console.log('Using mock data for todosExames (no DB access available)')
        todosExames = []
        loadedFrom = 'mock'
      }
    } catch (err) {
      console.error('Error loading exames from DB:', err)
      todosExames = []
      loadedFrom = 'error'
    }

    console.log('todosExames loadedFrom=', loadedFrom)

    // ---------------------------------------------------------
    // 2. PROCESSAMENTO: KPIS GERAIS
    // ---------------------------------------------------------
    const totalExames = todosExames.length
    const examesComAfastamento = todosExames.filter(
      (e) => e.afastamento?.trim().toLowerCase() === 'sim'
    )
    const totalAfastamentos = examesComAfastamento.length

    const kpis = {
      totalExames,
      totalAfastamentos,
      percentualGeral: totalExames > 0 ? (totalAfastamentos / totalExames) * 100 : 0,
    }

    // ---------------------------------------------------------
    // 3. PROCESSAMENTO: TOP EMPRESAS (Para o Gráfico de Barras)
    // ---------------------------------------------------------
    
    // Agrupa afastamentos por empresa
    const afastamentosPorEmpresa = {};
    
    examesComAfastamento.forEach(exame => {
      const emp = exame.empresa;
      afastamentosPorEmpresa[emp] = (afastamentosPorEmpresa[emp] || 0) + 1;
    });

    // Transforma em array e ordena para pegar o Top 5
    const topEmpresas = Object.entries(afastamentosPorEmpresa)
      .map(([empresa, total]) => {
        // Opcional: Calcular percentual específico da empresa se quiser
        return { 
          empresa, 
          total,
          percentual: 0 // Simplificado para este exemplo visual
        }; 
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // Pega só as 5 primeiras

    // ---------------------------------------------------------
    // 4. PROCESSAMENTO: MÉDICOS (Para a Tabela)
    // ---------------------------------------------------------
    
    // Precisamos de dois contadores: total de exames E total de afastamentos por médico
    const statsMedicos = {};

    todosExames.forEach(exame => {
      const medico = exame.medico_responsavel;
      
      if (!statsMedicos[medico]) {
        statsMedicos[medico] = { medico, exames: 0, afastamentos: 0 };
      }
      
      statsMedicos[medico].exames += 1;
      
      if (exame.afastamento?.trim().toLowerCase() === 'sim') {
        statsMedicos[medico].afastamentos += 1;
      }
    });

    // Transforma em array e calcula a % de "rigor"
    const listaMedicos = Object.values(statsMedicos)
      .map(m => ({
        ...m,
        percentual: m.exames > 0 ? (m.afastamentos / m.exames) * 100 : 0
      }))
      .sort((a, b) => b.percentual - a.percentual); // Ordena pelos que mais reprovam

    // ---------------------------------------------------------
    // 5. PROCESSAMENTO: EVOLUÇÃO TEMPORAL (Para o Gráfico de Linha)
    // ---------------------------------------------------------

    // O Recharts precisa de algo como: [{ nome: 'Jan/2024', TechSolutions: 5, ConstruTudo: 2 }]
    // Usaremos uma chave numérica (ano*100 + mês) para garantir ordenação correta
    // e evitar problemas com localizações/formatos de mês (ex: 'jan.' vs 'jan').
    const evolucaoMap = {}; // chave: year*100 + month (e.g. 202401)

      // Foca apenas nas Top 3 empresas para o gráfico não ficar poluído
      const top3Nomes = topEmpresas.slice(0, 3).map(e => e.empresa);

      // Queremos exatamente Jan..Dez do ANO ATUAL como eixo X.
      const mesesDisplay = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const currentYear = new Date().getFullYear();

      // Inicializa todas as entradas do ano atual com zeros para as top3
      for (let m = 1; m <= 12; m++) {
        const sortKey = currentYear * 100 + m;
        evolucaoMap[sortKey] = { __sort: sortKey, nome: mesesDisplay[m - 1] };
        top3Nomes.forEach(emp => (evolucaoMap[sortKey][emp] = 0));
      }

      // Preenche os valores a partir dos exames do ano atual
      examesComAfastamento.forEach(exame => {
        const data = new Date(exame.data_exame);
        const year = data.getFullYear();
        if (year !== currentYear) return; // ignorar outros anos

        const month = data.getMonth() + 1; // 1-12
        const sortKey = year * 100 + month;
        // Só acumula se a empresa estiver entre o top3
        if (!top3Nomes.includes(exame.empresa)) return;

        evolucaoMap[sortKey][exame.empresa] = (evolucaoMap[sortKey][exame.empresa] || 0) + 1;
      });

      // Ordena de Jan a Dez e remove a chave auxiliar
      const evolucaoGrafico = Object.values(evolucaoMap)
        .filter(item => Math.floor(item.__sort / 100) === currentYear)
        .sort((a, b) => a.__sort - b.__sort)
        .map(({ __sort, ...rest }) => rest);


    // ---------------------------------------------------------
    // 6. RESPOSTA FINAL (JSON)
    // ---------------------------------------------------------
    return NextResponse.json({
      resumo: kpis,
      topEmpresas,
      medicos: listaMedicos,
      evolucao: evolucaoGrafico
    });

  } catch (error) {
    console.error('Erro no Dashboard API:', error);
    return NextResponse.json(
      { error: 'Erro ao processar dados do dashboard' },
      { status: 500 }
    );
  }
}