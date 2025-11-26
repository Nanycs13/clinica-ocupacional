'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Statistic, Spin, message, Tag } from 'antd'
import {
  MedicineBoxOutlined,
  ReconciliationOutlined, // Para representar exames/contratos
  UserDeleteOutlined,     // Para representar afastamentos
  FileProtectOutlined,    // Para atestados/médicos
  FallOutlined            // Para taxas
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
  // SIMULAÇÃO DA API (Aqui entraria o retorno do seu Python)
  // ==========================================
  async function carregarDashboard() {
    try {
      setLoading(true)
      
      // Simulando um delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000));

      // DADOS MOCKADOS (Simulando o resultado dos seus scripts Python)
      const dataSimulada = {
        kpis: {
          totalExames: 12450,
          totalAfastamentos: 890,
          taxaMediaAfastamento: 7.15
        },
        // Baseado no Script 1: Afastamentos por Empresa
        empresasRanking: [
          { empresa: 'TechSolutions', total_afastamentos: 120, total_exames: 800, percentual: 15.0 },
          { empresa: 'ConstruTudo', total_afastamentos: 95, total_exames: 400, percentual: 23.75 },
          { empresa: 'Varejo Bom Preço', total_afastamentos: 80, total_exames: 1200, percentual: 6.66 },
          { empresa: 'Logística Rápida', total_afastamentos: 60, total_exames: 500, percentual: 12.0 },
          { empresa: 'Banco Seguro', total_afastamentos: 45, total_exames: 900, percentual: 5.0 }
        ],
        // Baseado no Script 2: Performance Médica
        medicosStats: [
          { medico: 'Dr. João Silva', total_exames: 450, total_afastamentos: 110, percentual: 24.4 },
          { medico: 'Dra. Ana Costa', total_exames: 500, total_afastamentos: 25, percentual: 5.0 },
          { medico: 'Dr. Pedro Santos', total_exames: 320, total_afastamentos: 90, percentual: 28.1 },
          { medico: 'Dra. Maria Oliveira', total_exames: 600, total_afastamentos: 30, percentual: 5.0 },
          { medico: 'Dr. Roberto Lima', total_exames: 400, total_afastamentos: 85, percentual: 21.25 }
        ],
        // Baseado no Script 3: Evolução Temporal (Agregado)
        evolucaoMensal: [
          { mes: 'Jan/24', TechSolutions: 10, ConstruTudo: 15, Varejo: 5 },
          { mes: 'Fev/24', TechSolutions: 12, ConstruTudo: 10, Varejo: 8 },
          { mes: 'Mar/24', TechSolutions: 25, ConstruTudo: 20, Varejo: 10 },
          { mes: 'Abr/24', TechSolutions: 18, ConstruTudo: 12, Varejo: 12 },
          { mes: 'Mai/24', TechSolutions: 30, ConstruTudo: 25, Varejo: 15 },
          { mes: 'Jun/24', TechSolutions: 25, ConstruTudo: 13, Varejo: 30 } // Pico no varejo
        ]
      }

      setDashboardData(dataSimulada)

    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error)
      message.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDashboard()
  }, [])

  // ==========================================
  // DEFINIÇÃO DAS TABELAS
  // ==========================================

  // Tabela 1: Empresas com mais afastamentos (Script 1)
  const columnsEmpresas = [
    {
      title: 'Empresa',
      dataIndex: 'empresa',
      key: 'empresa',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Total Exames',
      dataIndex: 'total_exames',
      key: 'total_exames',
      align: 'right'
    },
    {
      title: 'Afastamentos',
      dataIndex: 'total_afastamentos',
      key: 'total_afastamentos',
      align: 'right',
      render: (val) => <span style={{ color: '#cf1322' }}>{val}</span>
    },
    {
      title: '% Taxa',
      dataIndex: 'percentual',
      key: 'percentual',
      align: 'right',
      render: (val) => {
        let color = val > 20 ? 'red' : val > 10 ? 'orange' : 'green';
        return <Tag color={color}>{val.toFixed(2)}%</Tag>
      }
    }
  ]

  // Tabela 2: Performance Médica (Script 2)
  const columnsMedicos = [
    {
      title: 'Médico Responsável',
      dataIndex: 'medico',
      key: 'medico'
    },
    {
      title: 'Exames Realizados',
      dataIndex: 'total_exames',
      key: 'total_exames',
      align: 'center'
    },
    {
      title: '% de Aptidão', // Inverso do afastamento
      key: 'aptidao',
      align: 'center',
      render: (_, record) => (
        <span style={{ color: '#3f8600' }}>
          {(100 - record.percentual).toFixed(1)}%
        </span>
      )
    },
    {
      title: '% Afastamento',
      dataIndex: 'percentual',
      key: 'percentual',
      align: 'center',
      sorter: (a, b) => a.percentual - b.percentual,
      render: (val) => <strong>{val.toFixed(2)}%</strong>
    }
  ]

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  if (loading) return <div className={styles.loading}><Spin size="large" /></div>
  if (!dashboardData) return null

  return (
    <div className={styles.container}>

      {/* HEADER */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <MedicineBoxOutlined className={styles.titleIcon} />
          Gestão de Saúde Ocupacional
        </h1>
        <p style={{ color: '#666' }}>Análise de exames admissionais, periódicos e demissionais</p>
      </div>

      {/* KPI CARDS (Totais Gerais) */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={24} sm={8}>
          <Card className={styles.statCard}>
            <Statistic
              title="Total de Exames Realizados"
              value={dashboardData.kpis.totalExames}
              prefix={<ReconciliationOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className={styles.statCard}>
            <Statistic
              title="Total de Afastamentos (Inaptos)"
              value={dashboardData.kpis.totalAfastamentos}
              prefix={<UserDeleteOutlined style={{ color: '#cf1322' }} />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className={styles.statCard}>
            <Statistic
              title="Taxa Global de Afastamento"
              value={dashboardData.kpis.taxaMediaAfastamento}
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
        
        {/* Gráfico 1: Top Empresas com Afastamentos (Visualização do Script 1) */}
        <Col xs={24} lg={12}>
          <Card title="🏢 Top Empresas por Volume de Afastamentos" className={styles.chartCard}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.empresasRanking} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="empresa" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="total_afastamentos" fill="#ff7875" name="Afastamentos" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Gráfico 2: Evolução Temporal (Visualização do Script 3) */}
        <Col xs={24} lg={12}>
          <Card title="📅 Evolução de Afastamentos (Top 3 Empresas)" className={styles.chartCard}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="TechSolutions" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="ConstruTudo" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="Varejo" stroke="#ffc658" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* TABELAS DETALHADAS */}
      <Row gutter={[16, 16]} className={styles.tablesRow}>
        
        {/* Tabela 1: Detalhamento por Empresa */}
        <Col xs={24} lg={12}>
          <Card title="📋 Relatório: Afastamentos por Empresa" className={styles.tableCard}>
            <Table
              dataSource={dashboardData.empresasRanking}
              columns={columnsEmpresas}
              rowKey="empresa"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>

        {/* Tabela 2: Análise Médica */}
        <Col xs={24} lg={12}>
          <Card 
            title={<span><FileProtectOutlined /> Análise de Rigor Médico (Percentual de Reprovações)</span>} 
            className={styles.tableCard}
          >
            <Table
              dataSource={dashboardData.medicosStats}
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