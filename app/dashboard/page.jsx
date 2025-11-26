'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Statistic, Spin, message, Tag } from 'antd'
import {
  MedicineBoxOutlined,
  ReconciliationOutlined,
  UserDeleteOutlined,
  FileProtectOutlined,
  FallOutlined
} from '@ant-design/icons'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts'
import styles from './dashboard.module.css'

export default function DashboardClinica() {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)

  // ==========================================
  // 1. CARREGAR DADOS REAIS DA API
  // ==========================================
  async function carregarDashboard() {
    try {
      setLoading(true)

      // Chamada real ao endpoint que criamos no route.js
      const response = await fetch('/api/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // cache: 'no-store' // Opcional: Para evitar cache em desenvolvimento
      })

      if (!response.ok) {
        throw Error(`Erro na API: ${response.status}`)
      }

      const data = await response.json()
      
      console.log('Dados recebidos do Backend:', data) // Útil para debug na aula
      setDashboardData(data)

    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error)
      message.error('Erro ao comunicar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDashboard()
  }, [])

  // ==========================================
  // DEFINIÇÃO DAS TABELAS (Ajustadas para o JSON do Backend)
  // ==========================================

  // Tabela 1: Empresas
  const columnsEmpresas = [
    {
      title: 'Empresa',
      dataIndex: 'empresa',
      key: 'empresa',
      render: (text) => <strong>{text}</strong>
    },
    {
      // O backend retorna 'total' para contagem de exames nessa view específica
      // Se quiser total de exames, precisaria ajustar no backend, 
      // mas aqui vamos usar o total de afastamentos que é o foco
      title: 'Afastamentos',
      dataIndex: 'total', // Ajustado: Backend envia 'total'
      key: 'total',
      align: 'right',
      render: (val) => <span style={{ color: '#cf1322' }}>{val}</span>
    },
    {
      title: '% Taxa',
      dataIndex: 'percentual',
      key: 'percentual',
      align: 'right',
      render: (val) => {
        // Proteção caso val seja null
        const valor = val ? val : 0; 
        let color = valor > 20 ? 'red' : valor > 10 ? 'orange' : 'green';
        return <Tag color={color}>{valor.toFixed(2)}%</Tag>
      }
    }
  ]

  // Tabela 2: Performance Médica
  const columnsMedicos = [
    {
      title: 'Médico Responsável',
      dataIndex: 'medico', // Ajustado: Backend envia 'medico'
      key: 'medico'
    },
    {
      title: 'Exames',
      dataIndex: 'exames', // Ajustado: Backend envia 'exames'
      key: 'exames',
      align: 'center'
    },
    {
      title: 'Afastamentos',
      dataIndex: 'afastamentos', // Ajustado: Backend envia 'afastamentos'
      key: 'afastamentos',
      align: 'center',
      render: (val) => <span style={{ color: '#cf1322' }}>{val}</span>
    },
    {
      title: '% Reprovação',
      dataIndex: 'percentual',
      key: 'percentual',
      align: 'center',
      sorter: (a, b) => a.percentual - b.percentual,
      render: (val) => <strong>{val ? val.toFixed(2) : 0}%</strong>
    }
  ]

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  if (loading) return <div className={styles.loading}><Spin size="large" /></div>
  if (!dashboardData) return null

  // Desestruturação segura para garantir que as chaves existam
  // Nota: 'resumo', 'topEmpresas', 'medicos', 'evolucao' vêm do route.js
  const { resumo, topEmpresas, medicos, evolucao } = dashboardData;

  // Define quais séries exibir no gráfico de evolução.
  // Preferimos usar os nomes das topEmpresas (Top 3); como fallback,
  // extraímos as chaves do primeiro item de `evolucao` (ignorando 'nome').
  const seriesNames = (topEmpresas && topEmpresas.length > 0)
    ? topEmpresas.slice(0, 3).map(e => e.empresa)
    : (evolucao && evolucao.length > 0)
      ? Object.keys(evolucao[0]).filter(k => k !== 'nome')
      : [];

  const seriesColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7875', '#1890ff'];

  return (
    <div className={styles.container}>

      {/* HEADER */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <MedicineBoxOutlined className={styles.titleIcon} />
          Gestão de Saúde Ocupacional
        </h1>
        <p style={{ color: '#666' }}>Dados em tempo real do banco de dados</p>
      </div>

      {/* KPI CARDS */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={24} sm={8}>
          <Card className={styles.statCard}>
            <Statistic
              title="Total de Exames"
              value={resumo?.totalExames || 0} // Ajustado para 'resumo'
              prefix={<ReconciliationOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className={styles.statCard}>
            <Statistic
              title="Total de Afastamentos"
              value={resumo?.totalAfastamentos || 0} // Ajustado para 'resumo'
              prefix={<UserDeleteOutlined style={{ color: '#cf1322' }} />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className={styles.statCard}>
            <Statistic
              title="Taxa de Inaptidão"
              value={resumo?.percentualGeral || 0} // Ajustado para 'resumo'
              precision={2}
              suffix="%"
              prefix={<FallOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* GRÁFICOS */}
      <Row gutter={[16, 16]} className={styles.chartsRow}>
        
        {/* Gráfico 1: Barras */}
        <Col xs={24} lg={12}>
          <Card title="🏢 Empresas com Mais Afastamentos" className={styles.chartCard}>
            <ResponsiveContainer width="100%" height={300}>
              {/* Ajustado data={topEmpresas} */}
              <BarChart data={topEmpresas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="empresa" type="category" width={100} style={{fontSize: '11px'}} />
                <Tooltip />
                {/* Ajustado dataKey="total" conforme backend */}
                <Bar dataKey="total" fill="#ff7875" name="Afastamentos" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Gráfico 2: Linhas (Evolução) */}
        <Col xs={24} lg={12}>
          <Card title="📅 Evolução Mensal (Top Empresas)" className={styles.chartCard}>
            <ResponsiveContainer width="100%" height={300}>
              {/* Ajustado data={evolucao} */}
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" /> {/* Backend envia 'nome' como o mês */}
                <YAxis />
                <Tooltip />
                <Legend />
                {/* IMPORTANTE: As linhas aqui dependem dos nomes exatos das empresas no seu CSV.
                  Se no CSV a empresa for "TechSolutions", o dataKey tem que ser igual.
                  Para a aula, garanta que o CSV tenha esses nomes ou altere as linhas abaixo
                  para os nomes que estão no seu banco.
                */}
                {seriesNames.map((name, idx) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={seriesColors[idx % seriesColors.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* TABELAS */}
      <Row gutter={[16, 16]} className={styles.tablesRow}>
        
        {/* Tabela 1: Empresas */}
        <Col xs={24} lg={12}>
          <Card title="📋 Ranking de Empresas" className={styles.tableCard}>
            <Table
              dataSource={topEmpresas} // Ajustado para variável correta
              columns={columnsEmpresas}
              rowKey="empresa"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>

        {/* Tabela 2: Médicos */}
        <Col xs={24} lg={12}>
          <Card 
            title={<span><FileProtectOutlined /> Análise de Rigor Médico</span>} 
            className={styles.tableCard}
          >
            <Table
              dataSource={medicos} // Ajustado para variável correta
              columns={columnsMedicos}
              rowKey="medico"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>

      </Row>
    </div>
  )
}