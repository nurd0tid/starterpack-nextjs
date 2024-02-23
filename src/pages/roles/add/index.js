import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AddRoles() {
  const [features, setFeatures] = useState([]);
  const [permission, setPermission] = useState([]);
  const [nameRole, setNameRole] = useState('');
  const [rolePermission, setRolePermission] = useState([]);

  const fetchFeatures = async () => {
    try {
      const response = await axios.get('/api/roles/features');

      if (response.status === 201) {
        setFeatures(response.data.data);
      } else {
        toast.error('Roles entry fetch failed');
      }
    } catch (error) {
      toast.error('Error fetching roles entry:', error);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchPermission = async () => {
    try {
      const response = await axios.get('/api/roles/permission');

      if (response.status === 201) {
        setPermission(response.data);
      } else {
        toast.error('Roles entry fetch failed');
      }
    } catch (error) {
      toast.error('Error fetching roles entry:', error);
    }
  };

  useEffect(() => {
    fetchPermission();
  }, []);

  const handlePermissionChange = (featureId, permissionId, checked) => {
    setRolePermission(prevState => {
      const index = prevState.findIndex(item => item.features_id === featureId);

      if (index !== -1) {
        // Jika fitur sudah ada dalam state, periksa apakah permission sudah ada
        if (checked && !prevState[index].permission.includes(permissionId)) {
          prevState[index].permission.push(permissionId);
        } else if (!checked && prevState[index].permission.includes(permissionId)) {
          prevState[index].permission = prevState[index].permission.filter(id => id !== permissionId);
        }
      } else {
        // Jika fitur belum ada dalam state, tambahkan dengan permission yang sesuai
        prevState.push({
          features_id: featureId,
          permission: checked ? [permissionId] : []
        });
      }

      return [...prevState];
    });
  };

  const handleSave = async () => {
    try {
      const response = await axios.post('/api/roles/create', {
        name: nameRole,
        roles: rolePermission
      });

      if (response.status === 201) {
        toast.success('Features entry created successfully');
        setNameRole('');
        setRolePermission([]);
        
        // Reset form switches to unchecked
        const formSwitches = document.querySelectorAll('input[type="checkbox"]');
        formSwitches.forEach(switchInput => {
          switchInput.checked = false;
        });
      }
    } catch (error) {
      toast.error('Error creating features entry:', error);
    }
  };

  return (
    <>
      <ToastContainer />
      <div className='main-content'>
        <Col lg={12}>
          <Form>
            <Row className='mb-5'>
              <Col lg={3}>
                <Form.Label>Roles Name</Form.Label>
              </Col>
              <Col lg={8}>
                <Form.Control
                  placeholder='Enter roles name'
                  value={nameRole}
                  onChange={(e) => setNameRole(e.target.value)}
                />
              </Col>
            </Row>
            {features.length > 0 ? (
              features.map((group, groupIndex) => (
                <Row className='mb-3' key={groupIndex}>
                  <Col lg={3} className='mb-2'>
                    <h6><b>Group ({group.group_name})</b></h6>
                  </Col>
                  {group.features.map((feature) => (
                    <Row key={feature.id}>
                      <Col lg={3}>
                        <Form.Label className='text-muted'>{feature.menu}</Form.Label>
                      </Col>
                      <Col lg={8}>
                        <Row>
                          <Col lg={9}>
                            <Row>
                              {permission.length > 0 && (
                                permission.map((perm, permIndex) => (
                                  <Col lg={3} key={permIndex}>
                                    <Form.Check
                                      type="switch"
                                      id={`${perm.id}-${groupIndex}-${feature.id}`}
                                      label={perm.name}
                                      onChange={(e) => handlePermissionChange(feature.id, perm.id, e.target.checked)}
                                    />
                                  </Col>
                                ))
                              )}
                            </Row>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  ))}
                </Row>
              ))
            ) : (
              <><p>Tunggu</p></>
            )}
          </Form>
          <Row className='mt-3'>
            <Col lg={12}>
              <Button onClick={handleSave}>Simpan</Button>
            </Col>
          </Row>
        </Col>
      </div>
    </>
  )
}

AddRoles.layout = 'MainLayout';
export default AddRoles;
