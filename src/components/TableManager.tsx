import { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabase';

interface TableManagerProps {
  selectedTable: string;
  onTableChange: (tableName: string) => void;
}

export default function TableManager({ selectedTable, onTableChange }: TableManagerProps) {
  const [availableTables, setAvailableTables] = useState<string[]>(['crawled_pages']);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAvailableTables();
  }, []);

  const loadAvailableTables = async () => {
    setIsLoading(true);
    try {
      const tables = await supabaseService.getAvailableTables();
      setAvailableTables(tables);
    } catch (error) {
      console.error('Failed to load available tables:', error);
      setAvailableTables(['crawled_pages']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    onTableChange(tableName);
  };

  return (
    <div className="table-manager">
      <style>{`
        .table-manager {
          background: rgba(22, 33, 62, 0.6);
          border: 1px solid rgba(141, 215, 247, 0.2);
          border-radius: 15px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .table-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .table-manager-title {
          color: #8dd7f7;
          font-weight: 700;
          font-size: 1.2rem;
          margin: 0;
        }

        .table-selector {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .table-dropdown {
          background: rgba(26, 26, 46, 0.8);
          border: 2px solid rgba(141, 215, 247, 0.3);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          color: #e6f3ff;
          font-family: 'Orbitron', monospace;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s ease;
        }

        .table-dropdown:focus {
          border-color: #8dd7f7;
          box-shadow: 0 0 10px rgba(141, 215, 247, 0.3);
        }

        .table-dropdown option {
          background: rgba(26, 26, 46, 0.9);
          color: #e6f3ff;
        }


        .table-info {
          color: rgba(230, 243, 255, 0.8);
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(141, 215, 247, 0.3);
          border-top: 2px solid #8dd7f7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 0.5rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .selected-table-indicator {
          background: linear-gradient(45deg, #4a9eff, #8dd7f7);
          color: #0a0a0f;
          padding: 0.25rem 0.75rem;
          border-radius: 15px;
          font-size: 0.8rem;
          font-weight: 700;
        }
      `}</style>

      <div className="table-manager-header">
        <h3 className="table-manager-title">🗃️ Storage Table Selector</h3>
        <div className="selected-table-indicator">
          Active: {selectedTable}
        </div>
      </div>

      <div className="table-selector">
        <div>
          <label style={{ color: '#8dd7f7', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>
            Select Storage Table:
          </label>
          {isLoading ? (
            <div style={{ color: '#8dd7f7', padding: '0.75rem' }}>
              <div className="loading-spinner"></div>
              Loading tables...
            </div>
          ) : (
            <select 
              className="table-dropdown"
              value={selectedTable}
              onChange={(e) => handleTableSelect(e.target.value)}
            >
              {availableTables.map((table) => (
                <option key={table} value={table}>
                  {table} {table === 'crawled_pages' ? '(default)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="table-info">
          <strong>Selected Table:</strong> <code>{selectedTable}</code><br/>
          This table will store all crawled documents. Each table maintains separate knowledge bases for better organization.
          <br/><br/>
          <strong>💡 Available Tables:</strong><br/>
          • <strong>crawled_pages</strong> - Default/general crawling<br/>
          • <strong>microsoft_docs</strong> - Microsoft documentation<br/>
          • <strong>agent_building</strong> - AI Agent development resources<br/>
          • <strong>azure_platforms</strong> - Azure platform documentation<br/>
          • <strong>knowledge_base</strong> - General knowledge management
        </div>
      </div>
    </div>
  );
}