import '../App.css'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function Dashboard() {

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Users Growth' },
    },
  };

  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [
      {
        label: 'Users',
        data: [10, 20, 15, 40],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  };

  return (
    <div className="main-content">
      <header className="flex items-center justify-between shadow-md p-4">
        <h2 className="text-xl font-semibold">Dashboard</h2>
      </header>

      <main className="p-6 grid gap-6 md:grid-cols-3">
        <div className="bg-white p-4 rounded shadow">
          <Line options={options} data={data} />
        </div>
        <div className="bg-white p-4 rounded shadow">📈 Card 2</div>
        <div className="bg-white p-4 rounded shadow">👤 Card 3</div>

        <div className="md:col-span-3 bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
          <p className="text-gray-600">Add charts, tables, stats here...</p>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
