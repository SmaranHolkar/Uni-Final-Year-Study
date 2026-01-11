import React from 'react';
import '../App.css';
import Sidebar from '../components/sidebar.jsx';
import MultiStepForm from '../components/Mainlearningcontainer.jsx';

export default function Learningpage() {
  return (
    <>
      <Sidebar />

      <main className="main-content">
        <h1 style={{marginTop:0}}>Learn</h1>
        <MultiStepForm />
      </main>
    </>
  );
}
