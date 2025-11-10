import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Waypoint, Route } from '../types/sailing';
import { parseGPX, generateGPX } from '../utils/gpxHandler';
import { getNavigationService } from '../services/navigationService';
import ErrorPanel from '../components/ErrorPanel';

const RouteScreen: React.FC = () => {
  const [route, setRoute] = useState<Route>({
    id: 'route-1',
    name: 'My Route',
    waypoints: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [waypointName, setWaypointName] = useState('');
  const [waypointLat, setWaypointLat] = useState('');
  const [waypointLon, setWaypointLon] = useState('');
  const [error, setError] = useState<string | null>(null);

  const importGPX = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/gpx+xml',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);

      const parseResult = await parseGPX(content);

      if (parseResult.error) {
        setError(parseResult.error);
        return;
      }

      if (parseResult.waypoints.length === 0) {
        setError('No waypoints found in GPX file');
        return;
      }

      const newRoute: Route = {
        ...route,
        waypoints: parseResult.waypoints,
        updatedAt: new Date(),
      };

      setRoute(newRoute);
      Alert.alert('Success', `Imported ${parseResult.waypoints.length} waypoints`);
    } catch (err) {
      setError(`Failed to import GPX: ${err.message}`);
    }
  };

  const exportGPX = async () => {
    if (route.waypoints.length === 0) {
      Alert.alert('Error', 'No waypoints to export');
      return;
    }

    try {
      const gpxContent = generateGPX(route);
      const fileName = `${route.name.replace(/\s+/g, '_')}_${Date.now()}.gpx`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, gpxContent);

      Alert.alert(
        'Success',
        `Route exported to:\n${filePath}\n\nYou can share this file using the Files app.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      setError(`Failed to export GPX: ${err.message}`);
    }
  };

  const openAddWaypointModal = () => {
    setEditingWaypoint(null);
    setWaypointName('');
    setWaypointLat('');
    setWaypointLon('');
    setModalVisible(true);
  };

  const openEditWaypointModal = (waypoint: Waypoint) => {
    setEditingWaypoint(waypoint);
    setWaypointName(waypoint.name);
    setWaypointLat(waypoint.latitude.toString());
    setWaypointLon(waypoint.longitude.toString());
    setModalVisible(true);
  };

  const saveWaypoint = () => {
    const lat = parseFloat(waypointLat);
    const lon = parseFloat(waypointLon);

    if (!waypointName.trim()) {
      Alert.alert('Error', 'Please enter a waypoint name');
      return;
    }

    if (isNaN(lat) || lat < -90 || lat > 90) {
      Alert.alert('Error', 'Invalid latitude (must be between -90 and 90)');
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      Alert.alert('Error', 'Invalid longitude (must be between -180 and 180)');
      return;
    }

    if (editingWaypoint) {
      // Update existing waypoint
      const updatedWaypoints = route.waypoints.map((wp) =>
        wp.id === editingWaypoint.id
          ? { ...wp, name: waypointName, latitude: lat, longitude: lon }
          : wp
      );
      setRoute({
        ...route,
        waypoints: updatedWaypoints,
        updatedAt: new Date(),
      });
    } else {
      // Add new waypoint
      const newWaypoint: Waypoint = {
        id: `wp-${Date.now()}`,
        name: waypointName,
        latitude: lat,
        longitude: lon,
        order: route.waypoints.length,
      };
      setRoute({
        ...route,
        waypoints: [...route.waypoints, newWaypoint],
        updatedAt: new Date(),
      });
    }

    setModalVisible(false);
  };

  const deleteWaypoint = (waypoint: Waypoint) => {
    Alert.alert('Delete Waypoint', `Delete "${waypoint.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const filtered = route.waypoints
            .filter((wp) => wp.id !== waypoint.id)
            .map((wp, index) => ({ ...wp, order: index }));
          setRoute({
            ...route,
            waypoints: filtered,
            updatedAt: new Date(),
          });
        },
      },
    ]);
  };

  const moveWaypointUp = (index: number) => {
    if (index === 0) return;

    const newWaypoints = [...route.waypoints];
    const temp = newWaypoints[index];
    newWaypoints[index] = newWaypoints[index - 1];
    newWaypoints[index - 1] = temp;

    // Update order
    newWaypoints.forEach((wp, i) => {
      wp.order = i;
    });

    setRoute({
      ...route,
      waypoints: newWaypoints,
      updatedAt: new Date(),
    });
  };

  const moveWaypointDown = (index: number) => {
    if (index === route.waypoints.length - 1) return;

    const newWaypoints = [...route.waypoints];
    const temp = newWaypoints[index];
    newWaypoints[index] = newWaypoints[index + 1];
    newWaypoints[index + 1] = temp;

    // Update order
    newWaypoints.forEach((wp, i) => {
      wp.order = i;
    });

    setRoute({
      ...route,
      waypoints: newWaypoints,
      updatedAt: new Date(),
    });
  };

  const activateRoute = () => {
    if (route.waypoints.length === 0) {
      Alert.alert('Error', 'Please add waypoints to the route first');
      return;
    }

    const navService = getNavigationService();
    navService.setRoute(route);
    Alert.alert('Success', 'Route activated! Go to the Sailing tab to see navigation guidance.');
  };

  const renderWaypoint = ({ item, index }: { item: Waypoint; index: number }) => (
    <View style={styles.waypointItem}>
      <View style={styles.waypointInfo}>
        <Text style={styles.waypointOrder}>{index + 1}</Text>
        <View style={styles.waypointDetails}>
          <Text style={styles.waypointName}>{item.name}</Text>
          <Text style={styles.waypointCoords}>
            {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
          </Text>
          {item.arrived && (
            <Text style={styles.arrivedText}>✓ Arrived</Text>
          )}
        </View>
      </View>
      <View style={styles.waypointActions}>
        <TouchableOpacity
          onPress={() => moveWaypointUp(index)}
          disabled={index === 0}
          style={[styles.actionButton, index === 0 && styles.actionButtonDisabled]}
        >
          <Text style={styles.actionButtonText}>↑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => moveWaypointDown(index)}
          disabled={index === route.waypoints.length - 1}
          style={[
            styles.actionButton,
            index === route.waypoints.length - 1 && styles.actionButtonDisabled,
          ]}
        >
          <Text style={styles.actionButtonText}>↓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openEditWaypointModal(item)}
          style={styles.actionButton}
        >
          <Text style={styles.actionButtonText}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => deleteWaypoint(item)}
          style={[styles.actionButton, styles.deleteButton]}
        >
          <Text style={styles.actionButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Route Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Name</Text>
          <TextInput
            style={styles.input}
            value={route.name}
            onChangeText={(text) => setRoute({ ...route, name: text, updatedAt: new Date() })}
            placeholder="Enter route name"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={importGPX}>
              <Text style={styles.buttonText}>Import GPX</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={exportGPX}>
              <Text style={styles.buttonText}>Export GPX</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.buttonAdd} onPress={openAddWaypointModal}>
            <Text style={styles.buttonText}>+ Add Waypoint</Text>
          </TouchableOpacity>
        </View>

        {/* Waypoints List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Waypoints ({route.waypoints.length})
          </Text>
          {route.waypoints.length === 0 ? (
            <Text style={styles.emptyText}>
              No waypoints yet. Add waypoints manually or import from GPX file.
            </Text>
          ) : (
            <FlatList
              data={route.waypoints}
              renderItem={renderWaypoint}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Activate Route */}
        {route.waypoints.length > 0 && (
          <TouchableOpacity style={styles.buttonActivate} onPress={activateRoute}>
            <Text style={styles.buttonText}>Activate Route for Navigation</Text>
          </TouchableOpacity>
        )}

        {/* Bottom padding for error panel */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add/Edit Waypoint Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingWaypoint ? 'Edit Waypoint' : 'Add Waypoint'}
            </Text>

            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              style={styles.modalInput}
              value={waypointName}
              onChangeText={setWaypointName}
              placeholder="Waypoint name"
            />

            <Text style={styles.modalLabel}>Latitude</Text>
            <TextInput
              style={styles.modalInput}
              value={waypointLat}
              onChangeText={setWaypointLat}
              keyboardType="numeric"
              placeholder="14.6037"
            />

            <Text style={styles.modalLabel}>Longitude</Text>
            <TextInput
              style={styles.modalInput}
              value={waypointLon}
              onChangeText={setWaypointLon}
              keyboardType="numeric"
              placeholder="-61.0589"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={saveWaypoint}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Panel */}
      <ErrorPanel error={error} onDismiss={() => setError(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  buttonAdd: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonActivate: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 24,
  },
  waypointItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  waypointInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  waypointOrder: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
    marginRight: 12,
    width: 24,
  },
  waypointDetails: {
    flex: 1,
  },
  waypointName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  waypointCoords: {
    fontSize: 12,
    color: '#666',
  },
  arrivedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  waypointActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    backgroundColor: '#0066CC',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  actionButtonDisabled: {
    backgroundColor: '#CCC',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonCancel: {
    backgroundColor: '#999',
  },
  modalButtonSave: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RouteScreen;
