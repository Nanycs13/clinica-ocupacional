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
      prisma = globalForPrisma.prisma || new PrismaClient()
      if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
      console.log('Prisma client loaded dynamically')
    } catch (err) {
      console.error('Prisma dynamic import failed:', err && err.message ? err.message : err)
      prisma = null
    }

    // Load data (fall back to empty array if Prisma unavailable)
    let todosExames = []
    if (prisma && prisma.exameMedico && typeof prisma.exameMedico.findMany === 'function') {
      todosExames = await prisma.exameMedico.findMany()
    } else {
      console.log('Using mock data for todosExames (Prisma unavailable)')
      todosExames = []
    }

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
    
    // O Recharts precisa de algo como: [{ nome: 'Jan', TechSolutions: 5, ConstruTudo: 2 }]
    const evolucaoMap = {}; // Chave será "Mes/Ano"

    // Vamos focar apenas no Top 3 empresas para o gráfico não ficar poluído
    const top3Nomes = topEmpresas.slice(0, 3).map(e => e.empresa);

    examesComAfastamento.forEach(exame => {
      // Verifica se a empresa é uma das top 3
      if (!top3Nomes.includes(exame.empresa)) return;

      const data = new Date(exame.data_exame);
      // Cria chave tipo "Jan" ou "01/2024" (Aqui usarei nome do mês abreviado)
      const mes = data.toLocaleString('pt-BR', { month: 'short' }); 
      // Dica: Para ordenar corretamente, seria ideal usar o número do mês, 
      // mas para o exemplo visual vamos usar o nome.

      if (!evolucaoMap[mes]) {
        evolucaoMap[mes] = { nome: mes };
        // Inicializa com 0 para as top 3
        top3Nomes.forEach(emp => evolucaoMap[mes][emp] = 0);
      }

      evolucaoMap[mes][exame.empresa] += 1;
    });

    // Ordenar os meses (Hack rápido: jan, fev, mar...)
    const ordemMeses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const evolucaoGrafico = Object.values(evolucaoMap).sort((a, b) => {
      return ordemMeses.indexOf(a.nome.toLowerCase()) - ordemMeses.indexOf(b.nome.toLowerCase());
    });


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